"""Modelo Elo e derivação de probabilidades de jogo.

Duas responsabilidades:
  1. Atualizar ratings após resultados reais (update_ratings).
  2. Converter diferença de Elo em probabilidades de jogo (outcome_*),
     usadas tanto pelas previsões quanto pela simulação Monte Carlo.

A fronteira é clara: aqui mora a MATEMÁTICA. A OpenAI nunca toca nisto.
"""

from __future__ import annotations

import numpy as np

from copa import config


# ──────────────────────────────────────────────────────────────
#  Expectativa de resultado (fórmula padrão do Elo)
# ──────────────────────────────────────────────────────────────
def expected_score(elo_a: float, elo_b: float, home_advantage: float = 0.0) -> float:
    """P(A) = 1 / (1 + 10^((EloB - EloA)/400)).

    Retorna a expectativa de pontuação de A (entre 0 e 1), onde vitória
    vale 1, empate 0.5 e derrota 0. `home_advantage` é somado ao Elo de A.
    """
    diff = (elo_b - elo_a - home_advantage) / 400.0
    return 1.0 / (1.0 + 10.0 ** diff)


def _goal_difference_multiplier(goal_diff: int) -> float:
    """Multiplicador de K conforme a margem de gols (padrão World Football Elo)."""
    g = abs(goal_diff)
    if g <= 1:
        return 1.0
    if g == 2:
        return 1.5
    return (11.0 + g) / 8.0


def update_ratings(
    elo_home: float,
    elo_away: float,
    home_goals: int,
    away_goals: int,
    k: float = config.ELO_K,
    home_advantage: float = config.HOME_ADVANTAGE,
) -> tuple[float, float]:
    """Retorna (novo_elo_home, novo_elo_away) após um resultado.

    A soma de Elo é conservada (o que um time ganha, o outro perde).
    """
    we_home = expected_score(elo_home, elo_away, home_advantage)
    if home_goals > away_goals:
        w_home = 1.0
    elif home_goals < away_goals:
        w_home = 0.0
    else:
        w_home = 0.5

    multiplier = _goal_difference_multiplier(home_goals - away_goals)
    delta = k * multiplier * (w_home - we_home)
    return elo_home + delta, elo_away - delta


# ──────────────────────────────────────────────────────────────
#  Modelo de gols (Poisson) a partir do Elo
# ──────────────────────────────────────────────────────────────
def expected_goals(
    elo_home: float,
    elo_away: float,
    home_advantage: float = config.HOME_ADVANTAGE,
) -> tuple[float, float]:
    """Converte a diferença de Elo em gols esperados (lambda) de cada lado."""
    supremacy = (elo_home + home_advantage - elo_away) / config.ELO_PER_GOAL
    lam_home = max(config.MIN_EXPECTED_GOALS, config.BASE_GOALS + supremacy / 2.0)
    lam_away = max(config.MIN_EXPECTED_GOALS, config.BASE_GOALS - supremacy / 2.0)
    return lam_home, lam_away


def _poisson_pmf(lam: float, max_goals: int) -> np.ndarray:
    """Vetor de probabilidades P(0..max_goals) para uma Poisson de média lam."""
    k = np.arange(max_goals + 1)
    # pmf = e^-lam * lam^k / k!
    log_pmf = -lam + k * np.log(lam) - np.cumsum(np.concatenate(([0.0], np.log(np.arange(1, max_goals + 1)))))
    return np.exp(log_pmf)


def outcome_probabilities(
    elo_home: float,
    elo_away: float,
    home_advantage: float = config.HOME_ADVANTAGE,
    max_goals: int = config.MAX_GOALS_GRID,
) -> dict[str, float]:
    """Probabilidades de vitória/empate/derrota + gols esperados de um jogo.

    Assume gols independentes seguindo Poisson (lambda derivado do Elo).
    Retorna dict com chaves: home_win, draw, away_win, xg_home, xg_away.
    """
    lam_home, lam_away = expected_goals(elo_home, elo_away, home_advantage)
    p_home = _poisson_pmf(lam_home, max_goals)
    p_away = _poisson_pmf(lam_away, max_goals)

    # Matriz conjunta de placares (independência): linha=gols casa, col=gols fora.
    joint = np.outer(p_home, p_away)
    home_win = float(np.tril(joint, -1).sum())  # casa > fora
    away_win = float(np.triu(joint, 1).sum())   # fora > casa
    draw = float(np.trace(joint))               # diagonal

    total = home_win + draw + away_win  # ~1, normaliza resíduo da grade finita
    return {
        "home_win": home_win / total,
        "draw": draw / total,
        "away_win": away_win / total,
        "xg_home": round(lam_home, 2),
        "xg_away": round(lam_away, 2),
    }


def advance_probability(
    elo_a: float, elo_b: float, home_advantage: float = 0.0
) -> float:
    """Probabilidade de A avançar num mata-mata.

    Modela um jogo único de verdade: resultado no tempo normal pelo modelo
    de gols (Poisson) e, em caso de empate, decisão por pênaltis tratada como
    moeda ~50/50. Isso adiciona a variância real de jogo único — favoritos
    não são tão dominantes quanto a expectativa PURA do Elo sugere, o que
    calibra para baixo a chance de título dos mais fortes.
    """
    p = outcome_probabilities(elo_a, elo_b, home_advantage)
    return p["home_win"] + 0.5 * p["draw"]


# Alias de compatibilidade (nome antigo usado em scenarios.py).
knockout_win_probability = advance_probability
