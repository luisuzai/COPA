"""Testes da simulação Monte Carlo."""

from __future__ import annotations

import math

import pytest

from copa.models.monte_carlo import simulate
from copa.probabilities import build_probabilities


def _teams():
    elos = {
        "a": [2100, 1900, 1700, 1500],
        "b": [2050, 1850, 1650, 1450],
    }
    teams = []
    for group, ratings in elos.items():
        for i, elo in enumerate(ratings):
            tid = f"t-{group}{i}"
            teams.append(
                {"id": tid, "slug": tid, "name": tid, "group": group, "elo": elo}
            )
    return teams


@pytest.fixture
def result():
    # Sem jogos finalizados → torneio inteiro simulado.
    return simulate(_teams(), matches=[], n_sims=4000, seed=42)


def test_probabilities_in_unit_interval(result):
    for tid in result.team_ids:
        assert 0.0 <= result.prob_champion(tid) <= 1.0
        assert 0.0 <= result.prob_advance_group(tid) <= 1.0


def test_exactly_one_champion_per_sim(result):
    assert int(result.champion.sum()) == result.n_sims


def test_stronger_team_more_likely_champion(result):
    # t-a0 (2100) é o mais forte; deve ter a maior chance de título.
    champ = {tid: result.prob_champion(tid) for tid in result.team_ids}
    assert champ["t-a0"] == max(champ.values())


def test_advance_group_probabilities_consistent(result):
    # Por grupo, a soma das chances de classificação ≈ 2 (2 vagas).
    by_group: dict[str, float] = {}
    for t in _teams():
        by_group.setdefault(t["group"], 0.0)
        by_group[t["group"]] += result.prob_advance_group(t["id"])
    for total in by_group.values():
        assert math.isclose(total, 2.0, abs_tol=0.05)


def test_build_probabilities_shape(result):
    payload = build_probabilities(result)
    assert payload["simulations"] == result.n_sims
    assert len(payload["teams"]) == len(result.team_ids)
    # Ordenado por chance de título (desc).
    champs = [t["champion"] for t in payload["teams"]]
    assert champs == sorted(champs, reverse=True)
