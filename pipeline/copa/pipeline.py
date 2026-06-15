"""Orquestrador do pipeline COPA.

Ordem: ingestão → Elo → Monte Carlo → probabilidades/cenários → IA → JSON.

Modos:
  - online (default): busca dados da football-data.org (precisa do token).
  - offline (--offline): usa os JSON já em /data (não chama a API).
  - sem IA (--no-ai): pula a geração de texto (não chama a OpenAI).
"""

from __future__ import annotations

import json

from copa import config, serializers
from copa.generation.openai_client import generate_article
from copa.ingestion import client, mapper
from copa.models import elo as elo_model
from copa.models.monte_carlo import simulate
from copa.probabilities import build_predictions, build_probabilities, build_rankings
from copa.scenarios import build_scenarios

_ELO_STATE = config.DATA_DIR / ".cache" / "elo_applied.json"
SCENARIO_TOP_N = 8


# ──────────────────────────────────────────────────────────────
#  Helpers
# ──────────────────────────────────────────────────────────────
def _team_by_id(teams: list[dict]) -> dict[str, dict]:
    return {t["id"]: t for t in teams}


def _load_applied() -> set[str]:
    if _ELO_STATE.exists():
        try:
            return set(json.loads(_ELO_STATE.read_text(encoding="utf-8")))
        except (json.JSONDecodeError, OSError):
            return set()
    return set()


def _save_applied(applied: set[str]) -> None:
    _ELO_STATE.parent.mkdir(parents=True, exist_ok=True)
    _ELO_STATE.write_text(json.dumps(sorted(applied)), encoding="utf-8")


def _merge_metadata(new_teams: list[dict], prev_teams: list[dict]) -> list[dict]:
    """Preserva flag/confederation/elo curados de /data ao re-ingerir da API."""
    prev = _team_by_id(prev_teams)
    for t in new_teams:
        old = prev.get(t["id"])
        if old:
            t["flag"] = old.get("flag", t["flag"])
            t["confederation"] = old.get("confederation", t["confederation"])
            t["elo"] = old.get("elo", t["elo"])
            # Preserva crest curado; usa o da API só se não houver.
            t["crest"] = old.get("crest") or t.get("crest")
            if not t.get("group"):
                t["group"] = old.get("group")
    return new_teams


def _update_elo(teams: list[dict], matches: list[dict]) -> list[dict]:
    """Atualiza Elo a partir de resultados, de forma incremental e idempotente."""
    elo_of = {t["id"]: float(t["elo"]) for t in teams}
    applied = _load_applied()

    finished = [
        m for m in matches
        if m["status"] == "finished" and m.get("homeScore") is not None
    ]
    finished.sort(key=lambda m: m.get("kickoff") or "")

    is_seeded = any(abs(e - config.DEFAULT_ELO) > 1 for e in elo_of.values())

    if not applied and is_seeded:
        # 1ª execução com Elo curado: assume que os JSON já refletem os
        # resultados finalizados. Marca como aplicados sem recalcular.
        applied.update(m["id"] for m in finished)
    else:
        for m in finished:
            if m["id"] in applied:
                continue
            if m["homeId"] not in elo_of or m["awayId"] not in elo_of:
                continue
            new_h, new_a = elo_model.update_ratings(
                elo_of[m["homeId"]], elo_of[m["awayId"]],
                int(m["homeScore"]), int(m["awayScore"]),
            )
            elo_of[m["homeId"]] = new_h
            elo_of[m["awayId"]] = new_a
            applied.add(m["id"])

    _save_applied(applied)
    for t in teams:
        t["elo"] = round(elo_of[t["id"]], 1)
    return teams


# ──────────────────────────────────────────────────────────────
#  Construção das estatísticas que alimentam a IA
# ──────────────────────────────────────────────────────────────
def _home_stats(teams, probabilities, rankings, matches) -> dict:
    by_id = _team_by_id(teams)
    top = [
        {
            "seleção": by_id[t["teamId"]]["name"],
            "campeão": t["champion"],
            "variação": t["championChange"],
        }
        for t in probabilities["teams"][:6]
    ]
    recent = [
        {
            "jogo": m["slug"],
            "placar": f'{m.get("homeScore")}-{m.get("awayScore")}',
        }
        for m in matches if m["status"] == "finished"
    ][-4:]
    return {"favoritos": top, "resultados_recentes": recent}


def _team_stats(team, teams, probabilities, predictions, scenarios, rank_of) -> dict:
    by_id = _team_by_id(teams)
    prob = next((p for p in probabilities["teams"] if p["teamId"] == team["id"]), {})
    next_match = next(
        (
            p for p in predictions["matches"]
            if team["id"] in (p["homeId"], p["awayId"])
        ),
        None,
    )
    next_info = None
    if next_match:
        opp_id = next_match["awayId"] if next_match["homeId"] == team["id"] else next_match["homeId"]
        next_info = {
            "adversário": by_id[opp_id]["name"],
            "prob_vitória": (
                next_match["homeWin"] if next_match["homeId"] == team["id"]
                else next_match["awayWin"]
            ),
        }
    scen = next((s for s in scenarios["teams"] if s["teamId"] == team["id"]), None)
    return {
        "seleção": team["name"],
        "elo": team["elo"],
        "ranking": rank_of.get(team["id"]),
        "grupo": team["group"],
        "prob_classificação": prob.get("advanceGroup"),
        "prob_semifinal": prob.get("semi"),
        "prob_final": prob.get("final"),
        "prob_título": prob.get("champion"),
        "próximo_jogo": next_info,
        "caminho_provável": _path_with_names(scen, by_id) if scen else None,
    }


def _path_with_names(scen, by_id) -> list[dict]:
    return [
        {
            "fase": step["stage"],
            "adversário": by_id[step["opponentId"]]["name"],
            "prob_vitória": step["winProbability"],
        }
        for step in scen["likeliestPath"]
    ]


def _match_stats(pred, teams) -> dict:
    by_id = _team_by_id(teams)
    return {
        "mandante": by_id[pred["homeId"]]["name"],
        "visitante": by_id[pred["awayId"]]["name"],
        "elo_mandante": by_id[pred["homeId"]]["elo"],
        "elo_visitante": by_id[pred["awayId"]]["elo"],
        "prob_vitória_mandante": pred["homeWin"],
        "prob_empate": pred["draw"],
        "prob_vitória_visitante": pred["awayWin"],
        "gols_esperados": f'{pred["expectedHomeGoals"]} x {pred["expectedAwayGoals"]}',
    }


def _scenario_stats(scen, teams, by_id) -> dict:
    return {
        "seleção": by_id[scen["teamId"]]["name"],
        "adversários_prováveis": [
            {
                "fase": o["stage"],
                "adversário": by_id[o["teamId"]]["name"],
                "probabilidade": o["probability"],
            }
            for o in scen["likelyOpponents"]
        ],
        "dificuldade_caminho": scen["pathDifficulty"],
    }


# ──────────────────────────────────────────────────────────────
#  Geração de artigos (IA)
# ──────────────────────────────────────────────────────────────
def _build_articles(
    teams, matches, probabilities, predictions, scenarios, rankings, no_ai: bool
) -> dict:
    from datetime import datetime, timezone

    now = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

    if no_ai or not config.OPENAI_ENABLED:
        # Mantém os artigos existentes (o site continua com texto).
        existing = serializers.read_json("articles.json")
        return existing or {"generatedAt": now, "items": []}

    prev = serializers.read_json("articles.json") or {"items": []}
    prev_by_key = {(a["type"], a["slug"]): a for a in prev["items"]}
    by_id = _team_by_id(teams)
    rank_of = {e["teamId"]: e["rank"] for e in rankings["entries"]}
    items = []

    def add(kind: str, slug: str, stats: dict):
        art = generate_article(kind=kind, slug=slug, stats=stats)
        if art is None:  # falha/sem cache → mantém o anterior, se houver
            art = prev_by_key.get((kind, slug))
        if art is not None:
            items.append(art)

    add("home", "home", _home_stats(teams, probabilities, rankings, matches))
    for team in teams:
        add("team", team["slug"], _team_stats(
            team, teams, probabilities, predictions, scenarios, rank_of))
    for pred in predictions["matches"]:
        add("match", pred["matchSlug"], _match_stats(pred, teams))
    for scen in scenarios["teams"]:
        add("scenario", by_id[scen["teamId"]]["slug"],
            _scenario_stats(scen, teams, by_id))

    return {"generatedAt": now, "items": items}


# ──────────────────────────────────────────────────────────────
#  Execução principal
# ──────────────────────────────────────────────────────────────
def run(offline: bool = False, no_ai: bool = False, n_sims: int = config.SIMULATIONS) -> None:
    prev_teams = serializers.read_json("teams.json") or []

    # 1. Ingestão
    if offline or not config.FOOTBALL_DATA_TOKEN:
        if not offline:
            print("⚠️  Sem FOOTBALL_DATA_TOKEN — rodando em modo offline (usando /data).")
        teams = prev_teams
        matches = serializers.read_json("matches.json") or []
        if not teams or not matches:
            raise SystemExit("Modo offline sem dados em /data. Rode online ao menos uma vez.")
    else:
        print("📡 Buscando dados da football-data.org…")
        raw_teams = client.fetch_teams()
        raw_matches = client.fetch_matches()
        teams, matches = mapper.map_payload(raw_teams, raw_matches)
        teams = _merge_metadata(teams, prev_teams)

    # 2. Elo
    print("📊 Atualizando Elo a partir dos resultados…")
    teams = _update_elo(teams, matches)

    # 3. Monte Carlo
    print(f"🎲 Rodando {n_sims:,} simulações Monte Carlo…")
    result = simulate(teams, matches, n_sims=n_sims)

    # 4. Probabilidades, ranking, previsões, cenários
    prev_probs = serializers.read_json("probabilities.json") or {"teams": []}
    prev_champ = {t["teamId"]: t["champion"] for t in prev_probs["teams"]}
    prev_rankings = serializers.read_json("rankings.json") or {"entries": []}
    prev_elo = {t["id"]: t["elo"] for t in prev_teams}
    prev_rank = {e["teamId"]: e["rank"] for e in prev_rankings["entries"]}

    probabilities = build_probabilities(result, prev_champ)
    rankings = build_rankings(teams, prev_elo, prev_rank)
    predictions = build_predictions(teams, matches)
    scenarios = build_scenarios(result, teams, top_n=SCENARIO_TOP_N)

    # 5. IA
    if no_ai or not config.OPENAI_ENABLED:
        print("✍️  Geração de IA desativada — mantendo artigos existentes.")
    else:
        print("✍️  Gerando análises com a OpenAI (com cache)…")
    articles = _build_articles(
        teams, matches, probabilities, predictions, scenarios, rankings, no_ai)

    # 6. Escrita
    print("💾 Escrevendo JSON em /data e copiando p/ web/public/data…")
    serializers.write_json("teams.json", teams)
    serializers.write_json("matches.json", matches)
    serializers.write_json("rankings.json", rankings)
    serializers.write_json("probabilities.json", probabilities)
    serializers.write_json("predictions.json", predictions)
    serializers.write_json("scenarios.json", scenarios)
    serializers.write_json("articles.json", articles)
    serializers.copy_client_data()

    print("✅ Pipeline concluído.")
