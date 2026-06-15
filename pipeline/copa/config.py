"""Configuração central do pipeline COPA.

Todos os caminhos e constantes do modelo ficam aqui — um único lugar
para ajustar K do Elo, número de simulações, vantagem de campo, etc.
"""

from __future__ import annotations

import os
from pathlib import Path

# ──────────────────────────────────────────────────────────────
#  Caminhos
# ──────────────────────────────────────────────────────────────
# Este arquivo: COPA/pipeline/copa/config.py
#   parents[0] = copa   parents[1] = pipeline   parents[2] = COPA (raiz)
ROOT_DIR: Path = Path(__file__).resolve().parents[2]
DATA_DIR: Path = ROOT_DIR / "data"
WEB_PUBLIC_DATA_DIR: Path = ROOT_DIR / "web" / "public" / "data"
CACHE_DIR: Path = DATA_DIR / ".cache" / "openai"

# JSON que o simulador precisa no browser (copiados p/ web/public/data).
CLIENT_DATA_FILES: tuple[str, ...] = (
    "teams.json",
    "matches.json",
    "probabilities.json",
    "predictions.json",
)

# ──────────────────────────────────────────────────────────────
#  Modelo Elo
# ──────────────────────────────────────────────────────────────
# K define a velocidade de ajuste do rating. Copa do Mundo usa K alto.
ELO_K: float = 50.0
# Vantagem de mando (em pontos de Elo). Copa 2026 é majoritariamente
# em campo neutro, então o default é 0; o anfitrião pode receber bônus.
HOME_ADVANTAGE: float = 0.0
# Elo inicial padrão para um time sem histórico.
DEFAULT_ELO: float = 1500.0

# ──────────────────────────────────────────────────────────────
#  Modelo de gols (Poisson) — converte diferença de Elo em gols esperados
# ──────────────────────────────────────────────────────────────
# Média de gols por time num jogo equilibrado.
BASE_GOALS: float = 1.35
# Quantos pontos de Elo equivalem a 1 gol de superioridade esperada.
ELO_PER_GOAL: float = 250.0
# Piso de gols esperados (evita lambda zero).
MIN_EXPECTED_GOALS: float = 0.15
# Grade máxima de gols ao calcular probabilidades de placar.
MAX_GOALS_GRID: int = 12

# ──────────────────────────────────────────────────────────────
#  Monte Carlo
# ──────────────────────────────────────────────────────────────
SIMULATIONS: int = 100_000
RANDOM_SEED: int | None = None  # defina um int para resultados reproduzíveis

# ──────────────────────────────────────────────────────────────
#  Ingestão (football-data.org)
# ──────────────────────────────────────────────────────────────
FOOTBALL_DATA_BASE_URL: str = "https://api.football-data.org/v4"
# Código da competição Copa do Mundo no plano gratuito.
COMPETITION_CODE: str = "WC"
FOOTBALL_DATA_TOKEN: str | None = os.getenv("FOOTBALL_DATA_TOKEN")

# ──────────────────────────────────────────────────────────────
#  OpenAI
# ──────────────────────────────────────────────────────────────
OPENAI_API_KEY: str | None = os.getenv("OPENAI_API_KEY")
OPENAI_MODEL: str = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
# Se False, o pipeline pula a geração de texto (útil p/ rodar sem custo).
OPENAI_ENABLED: bool = bool(OPENAI_API_KEY)
