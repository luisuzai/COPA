"""Orquestrador do pipeline COPA.

Ordem: ingestão → Elo → Monte Carlo → probabilidades/cenários → IA → JSON.

Modos:
  - online (default): busca dados da football-data.org (precisa do token).
  - offline (--offline): usa os JSON já em /data (não chama a API).
  - sem IA (--no-ai): pula a geração de texto (não chama a OpenAI).
"""

from __future__ import annotations

import json

from tqdm import tqdm

from copa import config, serializers
from copa.generation.openai_client import generate_article
from copa.ingestion import client, mapper
from copa.models import elo as elo_model
from copa.models.monte_carlo import simulate
from copa.probabilities import build_predictions, build_probabilities, build_rankings
from copa.scenarios import build_scenarios

SCENARIO_TOP_N = 12

# Fases por extenso (pt-BR). Evita que o jargão do modelo ("round_of_32")
# vaze para o texto: traduzimos na ENTRADA, não confiamos na instrução.
STAGE_LABELS = {
    "group": "fase de grupos",
    "round_of_32": "16-avos de final",
    "round_of_16": "oitavas de final",
    "quarter": "quartas de final",
    "semi": "semifinal",
    "final": "final",
    "third_place": "disputa de terceiro lugar",
}


# ──────────────────────────────────────────────────────────────
#  Helpers
# ──────────────────────────────────────────────────────────────
def _team_by_id(teams: list[dict]) -> dict[str, dict]:
    return {t["id"]: t for t in teams}


def _stage_label(stage: str) -> str:
    return STAGE_LABELS.get(stage, stage)


def _pct(x) -> str | None:
    """Fração (0.458) → percentual pt-BR ('45,8%').

    Damos ao modelo a string já pronta: ele não precisa converter nem arredondar
    (o que faz mal). '45.0' vira '45%'; '45.83' vira '45,8%'.
    """
    if x is None:
        return None
    v = round(float(x) * 100, 1)
    s = f"{v:.1f}".rstrip("0").rstrip(".")
    return s.replace(".", ",") + "%"


def _trend(change) -> str | None:
    """championChange (fração) → tendência legível ('em alta (+0,3 pp)')."""
    if change is None:
        return None
    pp = round(float(change) * 100, 1)
    if abs(pp) < 0.1:
        return "estável"
    label = "em alta" if pp > 0 else "em queda"
    sign = "+" if pp > 0 else "-"
    return f"{label} ({sign}{abs(pp):.1f} pp)".replace(".", ",")


def _recent_form(team_id, matches, by_id, n: int = 4) -> list[str]:
    """Últimos N resultados da seleção, do mais antigo ao mais recente.

    Enriquecimento a partir de matches.json — a "outra fonte" que já temos.
    Ex.: 'venceu Senegal por 3 a 2'.
    """
    finished = [
        m for m in matches
        if m["status"] == "finished" and m.get("homeScore") is not None
        and team_id in (m["homeId"], m["awayId"])
    ]
    finished.sort(key=lambda m: m.get("kickoff") or "")
    out = []
    for m in finished[-n:]:
        is_home = m["homeId"] == team_id
        gf = m["homeScore"] if is_home else m["awayScore"]
        ga = m["awayScore"] if is_home else m["homeScore"]
        opp = by_id[m["awayId"] if is_home else m["homeId"]]["name"]
        if gf > ga:
            out.append(f"venceu {opp} por {gf} a {ga}")
        elif gf < ga:
            out.append(f"perdeu para {opp} por {ga} a {gf}")
        else:
            out.append(f"empatou com {opp} em {gf} a {ga}")
    return out


def _group_standing(team_id, teams, matches) -> dict | None:
    """Posição/pontos da seleção no grupo (só jogos finalizados)."""
    team = next((t for t in teams if t["id"] == team_id), None)
    if not team or not team.get("group"):
        return None
    group = team["group"]
    members = [t for t in teams if t.get("group") == group]
    table = {t["id"]: {"id": t["id"], "pts": 0, "gf": 0, "ga": 0} for t in members}
    for m in matches:
        if (m.get("group") != group or m["status"] != "finished"
                or m.get("homeScore") is None):
            continue
        h, a = m["homeId"], m["awayId"]
        if h not in table or a not in table:
            continue
        hs, as_ = int(m["homeScore"]), int(m["awayScore"])
        table[h]["gf"] += hs; table[h]["ga"] += as_
        table[a]["gf"] += as_; table[a]["ga"] += hs
        if hs > as_:
            table[h]["pts"] += 3
        elif hs < as_:
            table[a]["pts"] += 3
        else:
            table[h]["pts"] += 1; table[a]["pts"] += 1
    rows = sorted(
        table.values(),
        key=lambda r: (r["pts"], r["gf"] - r["ga"], r["gf"]),
        reverse=True,
    )
    pos = next((i + 1 for i, r in enumerate(rows) if r["id"] == team_id), None)
    me = table[team_id]
    return {
        "posição": pos,
        "de_times": len(rows),
        "pontos": me["pts"],
        "saldo_de_gols": me["gf"] - me["ga"],
    }


def _difficulty_labeler(scenarios):
    """Converte o índice numérico de dificuldade do caminho em rótulo legível,
    relativo ao conjunto das seleções analisadas (terços)."""
    vals = sorted(s["pathDifficulty"] for s in scenarios["teams"])
    n = len(vals)
    if n == 0:
        return lambda _x: "caminho equilibrado"
    lo = vals[n // 3]
    hi = vals[(2 * n) // 3]

    def label(x):
        if x >= hi:
            return "caminho difícil"
        if x <= lo:
            return "caminho relativamente tranquilo"
        return "caminho equilibrado"

    return label


def _merge_metadata(new_teams: list[dict], prev_teams: list[dict]) -> list[dict]:
    """Preserva metadata curada (flag emoji, grupo) ao re-ingerir da API.

    Elo/eloBase NÃO são carregados: o baseline vem sempre do seed (seed_elo)
    e o Elo atual é recalculado por replay dos resultados (idempotente).
    """
    prev = _team_by_id(prev_teams)
    for t in new_teams:
        old = prev.get(t["id"])
        if old:
            if old.get("flag") and old["flag"] != "🏳️":
                t["flag"] = old["flag"]
            t["crest"] = t.get("crest") or old.get("crest")
            if not t.get("group"):
                t["group"] = old.get("group")
    return new_teams


def _update_elo(teams: list[dict], matches: list[dict]) -> list[dict]:
    """Recalcula o Elo atual por REPLAY dos resultados a partir do baseline.

    Idempotente: cada execução parte do eloBase (pré-Copa) e aplica todos os
    jogos finalizados em ordem cronológica. Rodar N vezes dá o mesmo resultado.
    """
    base = {t["id"]: float(t.get("eloBase", t["elo"])) for t in teams}
    elo_of = dict(base)

    finished = [
        m for m in matches
        if m["status"] == "finished" and m.get("homeScore") is not None
    ]
    finished.sort(key=lambda m: m.get("kickoff") or "")

    for m in finished:
        if m["homeId"] not in elo_of or m["awayId"] not in elo_of:
            continue
        new_h, new_a = elo_model.update_ratings(
            elo_of[m["homeId"]], elo_of[m["awayId"]],
            int(m["homeScore"]), int(m["awayScore"]),
        )
        elo_of[m["homeId"]] = new_h
        elo_of[m["awayId"]] = new_a

    for t in teams:
        t["eloBase"] = round(base[t["id"]], 1)
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
            "chance_título": _pct(t["champion"]),
            "tendência": _trend(t.get("championChange")),
        }
        for t in probabilities["teams"][:6]
    ]
    finished = [
        m for m in matches
        if m["status"] == "finished" and m.get("homeScore") is not None
    ]
    finished.sort(key=lambda m: m.get("kickoff") or "")
    recent = [
        f'{by_id[m["homeId"]]["name"]} {m["homeScore"]} a {m["awayScore"]} '
        f'{by_id[m["awayId"]]["name"]}'
        for m in finished[-5:]
    ]
    return {"favoritos": top, "resultados_recentes": recent}


def _team_stats(team, teams, matches, probabilities, predictions, scenarios) -> dict:
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
            "chance_vitória": _pct(
                next_match["homeWin"] if next_match["homeId"] == team["id"]
                else next_match["awayWin"]
            ),
        }
    scen = next((s for s in scenarios["teams"] if s["teamId"] == team["id"]), None)
    return {
        "seleção": team["name"],
        "grupo": (team.get("group") or "").upper() or None,
        "situação_no_grupo": _group_standing(team["id"], teams, matches),
        "forma_recente": _recent_form(team["id"], matches, by_id),
        "chance_classificação": _pct(prob.get("advanceGroup")),
        "chance_semifinal": _pct(prob.get("semi")),
        "chance_final": _pct(prob.get("final")),
        "chance_título": _pct(prob.get("champion")),
        "tendência_título": _trend(prob.get("championChange")),
        "próximo_jogo": next_info,
        "caminho_provável": _path_with_names(scen, by_id) if scen else None,
    }


def _path_with_names(scen, by_id) -> list[dict]:
    return [
        {
            "fase": _stage_label(step["stage"]),
            "adversário": by_id[step["opponentId"]]["name"],
            "chance_vitória": _pct(step["winProbability"]),
        }
        for step in scen["likeliestPath"]
    ]


def _match_stats(pred, teams, matches) -> dict:
    by_id = _team_by_id(teams)
    home, away = by_id[pred["homeId"]], by_id[pred["awayId"]]
    hw, aw = pred["homeWin"], pred["awayWin"]
    if abs(hw - aw) < 0.08:
        favoritismo = "confronto equilibrado"
    elif hw > aw:
        favoritismo = f"{home['name']} é favorito"
    else:
        favoritismo = f"{away['name']} é favorito"
    match = next((m for m in matches if m["slug"] == pred["matchSlug"]), None)
    if match:
        fase = (f"Grupo {match['group'].upper()}" if match.get("group")
                else _stage_label(match["stage"]))
    else:
        fase = None
    return {
        "mandante": home["name"],
        "visitante": away["name"],
        "fase": fase,
        "favoritismo": favoritismo,
        "chance_vitória_mandante": _pct(hw),
        "chance_empate": _pct(pred["draw"]),
        "chance_vitória_visitante": _pct(aw),
        # Placar já ARREDONDADO (inteiros) — não damos decimais ao modelo.
        "placar_provável": f'{round(pred["expectedHomeGoals"])} a {round(pred["expectedAwayGoals"])}',
        "forma_mandante": _recent_form(pred["homeId"], matches, by_id),
        "forma_visitante": _recent_form(pred["awayId"], matches, by_id),
        "situação_grupo_mandante": _group_standing(pred["homeId"], teams, matches),
        "situação_grupo_visitante": _group_standing(pred["awayId"], teams, matches),
    }


def _recap_stats(match, teams, probabilities) -> dict:
    by_id = _team_by_id(teams)
    prob = {p["teamId"]: p for p in probabilities["teams"]}
    home, away = by_id[match["homeId"]], by_id[match["awayId"]]
    hs, as_ = int(match["homeScore"]), int(match["awayScore"])
    if hs > as_:
        resultado = f"vitória de {home['name']}"
    elif hs < as_:
        resultado = f"vitória de {away['name']}"
    else:
        resultado = "empate"

    def team_info(t):
        p = prob.get(t["id"], {})
        return {
            "seleção": t["name"],
            "chance_título": _pct(p.get("champion")),
            "chance_de_avançar_da_fase_de_grupos": _pct(p.get("advanceGroup")),
            "tendência_título": _trend(p.get("championChange")),
        }

    return {
        "placar": f"{home['name']} {hs} x {as_} {away['name']}",
        "resultado": resultado,
        "fase": f"Grupo {match['group'].upper()}" if match.get("group") else _stage_label(match["stage"]),
        "mandante": team_info(home),
        "visitante": team_info(away),
    }


def _scenario_stats(scen, teams, by_id, difficulty_label) -> dict:
    return {
        "seleção": by_id[scen["teamId"]]["name"],
        "adversários_prováveis": [
            {
                "fase": _stage_label(o["stage"]),
                "adversário": by_id[o["teamId"]]["name"],
                "probabilidade": _pct(o["probability"]),
            }
            for o in scen["likelyOpponents"]
        ],
        "dificuldade_caminho": difficulty_label(scen["pathDifficulty"]),
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
    difficulty_label = _difficulty_labeler(scenarios)

    # Monta a fila de tarefas (kind, slug, stats) para gerar com barra de progresso.
    tasks: list[tuple[str, str, dict]] = []
    tasks.append(("home", "home", _home_stats(teams, probabilities, rankings, matches)))
    for team in teams:
        tasks.append(("team", team["slug"], _team_stats(
            team, teams, matches, probabilities, predictions, scenarios)))
    for pred in predictions["matches"]:
        tasks.append(("match", pred["matchSlug"], _match_stats(pred, teams, matches)))
    # Pós-jogo (recap) para partidas já finalizadas.
    for m in matches:
        if m["status"] == "finished" and m.get("homeScore") is not None:
            tasks.append(("recap", m["slug"], _recap_stats(m, teams, probabilities)))
    for scen in scenarios["teams"]:
        tasks.append(("scenario", by_id[scen["teamId"]]["slug"],
                      _scenario_stats(scen, teams, by_id, difficulty_label)))

    items = []
    bar = tqdm(tasks, desc="✍️  Gerando análises", unit="texto", ncols=80)
    for kind, slug, stats in bar:
        bar.set_postfix_str(f"{kind}/{slug}"[:32])
        art = generate_article(kind=kind, slug=slug, stats=stats)
        if art is None:  # falha/sem cache → mantém o anterior, se houver
            art = prev_by_key.get((kind, slug))
        if art is not None:
            items.append(art)

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
    serializers.write_json("history.json", _update_history(probabilities))
    serializers.copy_client_data()

    print("✅ Pipeline concluído.")


def _update_history(probabilities: dict) -> dict:
    """Acumula um snapshot diário da chance de título (evolução ao longo da Copa).

    Idempotente por data: re-rodar no mesmo dia sobrescreve o snapshot do dia.
    Mantém os últimos 90 dias. Sem infra — apenas um JSON versionado.
    """
    date = probabilities["generatedAt"][:10]
    champions = {t["teamId"]: t["champion"] for t in probabilities["teams"]}
    hist = serializers.read_json("history.json") or {"snapshots": []}
    snaps = [s for s in hist["snapshots"] if s["date"] != date]
    snaps.append({"date": date, "champions": champions})
    snaps.sort(key=lambda s: s["date"])
    return {"snapshots": snaps[-90:]}
