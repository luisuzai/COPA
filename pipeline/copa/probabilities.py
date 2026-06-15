"""Transforma a saída crua do Monte Carlo em estruturas prontas p/ JSON.

Aqui também ficam o ranking (derivado do Elo) e as previsões de jogo
(derivadas do modelo de gols). Nenhuma chamada de IA — só números.
"""

from __future__ import annotations

from datetime import datetime, timezone

from copa.models import elo as elo_model
from copa.models.monte_carlo import KNOCKOUT_STAGES, SimulationResult


def _now() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def build_probabilities(
    result: SimulationResult,
    previous: dict[str, float] | None = None,
) -> dict:
    """Monta o dict de probabilities.json a partir da simulação.

    `previous` mapeia teamId -> champion anterior, p/ calcular championChange.
    """
    previous = previous or {}
    teams_out = []
    for team_id in result.team_ids:
        advance = result.prob_advance_group(team_id)
        champion = result.prob_champion(team_id)
        teams_out.append(
            {
                "teamId": team_id,
                "advanceGroup": round(advance, 4),
                "roundOf16": round(result.prob_reach(team_id, "round_of_16", advance), 4),
                "quarter": round(result.prob_reach(team_id, "quarter", advance), 4),
                "semi": round(result.prob_reach(team_id, "semi", advance), 4),
                "final": round(result.prob_reach(team_id, "final", advance), 4),
                "champion": round(champion, 4),
                "championChange": round(champion - previous.get(team_id, champion), 4),
            }
        )

    teams_out.sort(key=lambda t: t["champion"], reverse=True)
    return {
        "generatedAt": _now(),
        "simulations": result.n_sims,
        "teams": teams_out,
    }


def build_rankings(
    teams: list[dict],
    previous_elo: dict[str, float] | None = None,
    previous_rank: dict[str, int] | None = None,
) -> dict:
    """Ranking ordenado por Elo, com variação de Elo e de posição."""
    previous_elo = previous_elo or {}
    previous_rank = previous_rank or {}

    ordered = sorted(teams, key=lambda t: t["elo"], reverse=True)
    entries = []
    for rank, team in enumerate(ordered, start=1):
        tid = team["id"]
        elo = round(float(team["elo"]))
        entries.append(
            {
                "teamId": tid,
                "rank": rank,
                "elo": elo,
                "eloChange": round(elo - previous_elo.get(tid, elo)),
                "rankChange": previous_rank.get(tid, rank) - rank,
            }
        )
    return {"generatedAt": _now(), "entries": entries}


def build_predictions(teams: list[dict], matches: list[dict]) -> dict:
    """Previsão (vit/empate/derrota + xG) p/ jogos ainda não finalizados."""
    elo_of = {t["id"]: float(t["elo"]) for t in teams}
    out = []
    for m in matches:
        if m["status"] == "finished":
            continue
        if m["homeId"] not in elo_of or m["awayId"] not in elo_of:
            continue
        probs = elo_model.outcome_probabilities(elo_of[m["homeId"]], elo_of[m["awayId"]])
        out.append(
            {
                "matchSlug": m["slug"],
                "homeId": m["homeId"],
                "awayId": m["awayId"],
                "homeWin": round(probs["home_win"], 4),
                "draw": round(probs["draw"], 4),
                "awayWin": round(probs["away_win"], 4),
                "expectedHomeGoals": probs["xg_home"],
                "expectedAwayGoals": probs["xg_away"],
            }
        )
    return {"generatedAt": _now(), "matches": out}
