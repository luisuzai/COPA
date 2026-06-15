"""Cliente da API football-data.org (competição WC, plano gratuito).

A chave fica em FOOTBALL_DATA_TOKEN (variável de ambiente / .env local).
NUNCA é commitada nem usada no GitHub Actions — só roda na sua máquina.

Plano gratuito: 10 requisições/minuto. O pipeline faz só 2 chamadas.
"""

from __future__ import annotations

import time
from typing import Any

import requests

from copa import config


class FootballDataError(RuntimeError):
    """Erro de comunicação com a football-data.org."""


def _headers() -> dict[str, str]:
    if not config.FOOTBALL_DATA_TOKEN:
        raise FootballDataError(
            "FOOTBALL_DATA_TOKEN não definido. Crie pipeline/.env a partir de "
            ".env.example com sua chave da football-data.org."
        )
    return {"X-Auth-Token": config.FOOTBALL_DATA_TOKEN}


def _get(path: str, retries: int = 3) -> dict[str, Any]:
    url = f"{config.FOOTBALL_DATA_BASE_URL}{path}"
    for attempt in range(retries):
        resp = requests.get(url, headers=_headers(), timeout=30)
        if resp.status_code == 429:  # rate limit — espera e tenta de novo
            wait = 6 * (attempt + 1)
            time.sleep(wait)
            continue
        if resp.status_code != 200:
            raise FootballDataError(f"GET {path} → {resp.status_code}: {resp.text[:200]}")
        return resp.json()
    raise FootballDataError(f"GET {path} falhou após {retries} tentativas (rate limit).")


def fetch_matches() -> list[dict[str, Any]]:
    """Todos os jogos da Copa (com placar quando finalizados)."""
    data = _get(f"/competitions/{config.COMPETITION_CODE}/matches")
    return data.get("matches", [])


def fetch_teams() -> list[dict[str, Any]]:
    """Seleções participantes da Copa."""
    data = _get(f"/competitions/{config.COMPETITION_CODE}/teams")
    return data.get("teams", [])
