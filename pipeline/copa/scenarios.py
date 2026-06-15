"""Cenários: adversários e caminho mais provável até a final.

Usa as contagens de confronto do Monte Carlo (result.opponents) para
responder perguntas como "quem o Brasil provavelmente enfrenta nas oitavas?"
e "qual o caminho mais provável até a final?".
"""

from __future__ import annotations

from datetime import datetime, timezone

import numpy as np

from copa.models import elo as elo_model
from copa.models.monte_carlo import STAGE_BY_SIZE, SimulationResult


def _now() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


# Fases do mata-mata, da mais cedo para a final.
_STAGE_ORDER = [STAGE_BY_SIZE[s] for s in sorted(STAGE_BY_SIZE, reverse=True)]


def _likely_opponent(
    result: SimulationResult, t_idx: int, stage: str
) -> tuple[int, float] | None:
    """Adversário mais provável de um time numa fase (idx global, prob)."""
    if stage not in result.opponents:
        return None
    row = result.opponents[stage][t_idx].astype(float)
    row[t_idx] = -1  # nunca contra si mesmo
    if row.max() <= 0:
        return None
    opp_idx = int(np.argmax(row))
    # Normaliza pela frequência com que o time chegou nesta fase.
    appearances = row.sum()
    prob = float(row[opp_idx] / appearances) if appearances > 0 else 0.0
    return opp_idx, prob


def build_scenarios(
    result: SimulationResult,
    teams: list[dict],
    top_n: int | None = None,
) -> dict:
    """Cenários para as `top_n` seleções com maior chance de título.

    Se top_n é None, gera para todas.
    """
    elo = result.elo
    team_ids = result.team_ids

    # Ordena por chance de título p/ priorizar os favoritos.
    ranked = sorted(
        range(len(team_ids)),
        key=lambda i: result.champion[i],
        reverse=True,
    )
    if top_n is not None:
        ranked = ranked[:top_n]

    out_teams = []
    for t_idx in ranked:
        likely_opponents = []
        path = []
        path_elos = []

        for stage in _STAGE_ORDER:
            found = _likely_opponent(result, t_idx, stage)
            if found is None:
                continue
            opp_idx, prob = found
            likely_opponents.append(
                {
                    "stage": stage,
                    "teamId": team_ids[opp_idx],
                    "probability": round(prob, 4),
                }
            )
            win_p = elo_model.knockout_win_probability(elo[t_idx], elo[opp_idx])
            path.append(
                {
                    "stage": stage,
                    "opponentId": team_ids[opp_idx],
                    "winProbability": round(win_p, 4),
                }
            )
            path_elos.append(elo[opp_idx])

        difficulty = round(float(np.mean(path_elos))) if path_elos else 0
        out_teams.append(
            {
                "teamId": team_ids[t_idx],
                "likelyOpponents": likely_opponents,
                "likeliestPath": path,
                "pathDifficulty": difficulty,
            }
        )

    return {"generatedAt": _now(), "teams": out_teams}
