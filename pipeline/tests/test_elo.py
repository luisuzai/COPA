"""Testes do modelo Elo e das probabilidades de jogo."""

from __future__ import annotations

import math

from copa.models import elo


def test_equal_elo_is_fifty_fifty():
    assert elo.expected_score(1500, 1500) == 0.5


def test_expected_scores_are_complementary():
    a = elo.expected_score(1800, 1600)
    b = elo.expected_score(1600, 1800)
    assert math.isclose(a + b, 1.0, abs_tol=1e-9)


def test_higher_elo_is_favored():
    assert elo.expected_score(2000, 1500) > 0.5


def test_home_advantage_increases_expectation():
    base = elo.expected_score(1700, 1700)
    with_home = elo.expected_score(1700, 1700, home_advantage=100)
    assert with_home > base


def test_update_conserves_total_rating():
    new_h, new_a = elo.update_ratings(1800, 1600, 2, 0)
    assert math.isclose(new_h + new_a, 1800 + 1600, abs_tol=1e-9)


def test_winner_gains_loser_loses():
    new_h, new_a = elo.update_ratings(1700, 1700, 3, 0)
    assert new_h > 1700 > new_a


def test_bigger_win_moves_rating_more():
    small = elo.update_ratings(1700, 1700, 1, 0)[0]
    big = elo.update_ratings(1700, 1700, 4, 0)[0]
    assert big > small


def test_outcome_probabilities_sum_to_one():
    p = elo.outcome_probabilities(1900, 1700)
    total = p["home_win"] + p["draw"] + p["away_win"]
    assert math.isclose(total, 1.0, abs_tol=1e-9)


def test_favorite_has_higher_win_probability():
    p = elo.outcome_probabilities(2100, 1600)
    assert p["home_win"] > p["away_win"]
    assert p["xg_home"] > p["xg_away"]
