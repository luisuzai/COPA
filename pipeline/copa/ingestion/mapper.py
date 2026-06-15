"""Converte a resposta da football-data.org para o nosso schema.

Os campos de identidade visual (flag, confederation) e o Elo NÃO vêm da API.
Eles são preservados a partir do data/teams.json existente (ver pipeline.py),
ou caem em defaults na primeira execução. Assim a API cuida de jogos/placares
e a metadata curada por nós permanece intacta entre rodadas.
"""

from __future__ import annotations

import re
import unicodedata
from typing import Any

from copa import config
from copa.seed_elo import SEED_CONF, SEED_ELO

# Mapeamento das fases da football-data.org → nosso schema.
_STAGE_MAP = {
    "GROUP_STAGE": "group",
    "LAST_32": "round_of_32",
    "ROUND_OF_32": "round_of_32",
    "LAST_16": "round_of_16",
    "ROUND_OF_16": "round_of_16",
    "QUARTER_FINALS": "quarter",
    "SEMI_FINALS": "semi",
    "THIRD_PLACE": "third_place",
    "FINAL": "final",
}

_STATUS_MAP = {
    "SCHEDULED": "scheduled",
    "TIMED": "scheduled",
    "IN_PLAY": "live",
    "PAUSED": "live",
    "FINISHED": "finished",
}


def slugify(value: str) -> str:
    """'Brasil' → 'brazil'-ish slug ASCII seguro p/ URL."""
    norm = unicodedata.normalize("NFKD", value).encode("ascii", "ignore").decode()
    norm = re.sub(r"[^a-zA-Z0-9]+", "-", norm).strip("-").lower()
    return norm


def _group_code(raw: str | None) -> str | None:
    """'GROUP_A' / 'Group A' → 'a'."""
    if not raw:
        return None
    letters = re.findall(r"[A-La-l]", raw.replace("GROUP", "").replace("Group", ""))
    return letters[-1].lower() if letters else None


def map_team(raw: dict[str, Any]) -> dict[str, Any]:
    """Mapeia um time da API para um Team parcial (sem flag/conf/elo curados)."""
    name = raw.get("name") or raw.get("shortName") or "Desconhecido"
    code = (raw.get("tla") or slugify(name)[:3]).upper()
    elo = SEED_ELO.get(code, config.DEFAULT_ELO)
    return {
        "id": f"t-{code.lower()}",
        "slug": slugify(name),
        "name": name,
        "code": code,
        # A API entrega a URL do escudo/bandeira — renderização robusta na web.
        "crest": raw.get("crest"),
        "flag": "🏳️",
        "confederation": SEED_CONF.get(code, "UEFA"),
        "group": None,
        # Elo atual (será recalculado pelos resultados) e baseline pré-Copa.
        "elo": elo,
        "eloBase": elo,
    }


def map_match(raw: dict[str, Any], team_by_api_id: dict[int, dict]) -> dict[str, Any] | None:
    """Mapeia um jogo da API. Retorna None se algum time for desconhecido."""
    home = team_by_api_id.get(raw["homeTeam"]["id"])
    away = team_by_api_id.get(raw["awayTeam"]["id"])
    if not home or not away:
        return None

    stage = _STAGE_MAP.get(raw.get("stage", ""), "group")
    status = _STATUS_MAP.get(raw.get("status", ""), "scheduled")
    group = _group_code(raw.get("group")) if stage == "group" else None

    match = {
        "id": f"m-{raw['id']}",
        "slug": f"{home['slug']}-vs-{away['slug']}",
        "stage": stage,
        "homeId": home["id"],
        "awayId": away["id"],
        "status": status,
        "kickoff": raw.get("utcDate"),
    }
    if group:
        match["group"] = group

    full_time = (raw.get("score") or {}).get("fullTime") or {}
    if status in ("finished", "live") and full_time.get("home") is not None:
        match["homeScore"] = int(full_time["home"])
        match["awayScore"] = int(full_time["away"])

    return match


def map_payload(
    raw_teams: list[dict], raw_matches: list[dict]
) -> tuple[list[dict], list[dict]]:
    """Converte teams + matches crus em nossas listas. Grupos vêm dos jogos."""
    teams = [map_team(t) for t in raw_teams]
    team_by_api_id = {t["id"]: mapped for t, mapped in zip(raw_teams, teams)}

    matches = []
    for raw in raw_matches:
        mapped = map_match(raw, team_by_api_id)
        if mapped is None:
            continue
        matches.append(mapped)
        # Preenche o grupo do time a partir dos jogos de fase de grupos.
        if mapped["stage"] == "group" and "group" in mapped:
            for tid in (mapped["homeId"], mapped["awayId"]):
                team = next((x for x in teams if x["id"] == tid), None)
                if team and team["group"] is None:
                    team["group"] = mapped["group"]

    return teams, matches
