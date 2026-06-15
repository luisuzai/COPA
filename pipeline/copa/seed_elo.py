"""Elo inicial (pré-Copa) e confederação das 48 seleções da Copa 2026.

São PRIORS aproximados (ordem de grandeza do World Football Elo). Servem de
ponto de partida; o modelo ajusta a partir dos resultados reais a cada rodada.
Chaveado pelo código FIFA de 3 letras (campo `tla` da football-data.org).

Ajuste fino à vontade — qualquer mudança aqui se propaga no próximo pipeline.
"""

from __future__ import annotations

SEED_ELO: dict[str, float] = {
    "ESP": 2100, "ARG": 2085, "FRA": 2070, "BRA": 2040, "ENG": 2015,
    "POR": 1995, "NED": 1985, "GER": 1955, "BEL": 1945, "CRO": 1900,
    "URY": 1895, "COL": 1875, "MAR": 1870, "SUI": 1850, "USA": 1845,
    "JPN": 1835, "MEX": 1820, "SEN": 1815, "AUT": 1810, "ECU": 1800,
    "TUR": 1800, "NOR": 1795, "KOR": 1790, "SWE": 1770, "ALG": 1765,
    "CZE": 1760, "CIV": 1760, "IRN": 1760, "EGY": 1755, "SCO": 1745,
    "PAR": 1745, "CAN": 1740, "AUS": 1730, "TUN": 1720, "BIH": 1710,
    "GHA": 1710, "COD": 1700, "UZB": 1675, "RSA": 1670, "PAN": 1660,
    "IRQ": 1660, "JOR": 1655, "KSA": 1650, "QAT": 1650, "NZL": 1620,
    "CPV": 1615, "HAI": 1585, "CUW": 1575,
}

SEED_CONF: dict[str, str] = {
    # UEFA
    "GER": "UEFA", "ESP": "UEFA", "FRA": "UEFA", "ENG": "UEFA", "POR": "UEFA",
    "NED": "UEFA", "BEL": "UEFA", "CRO": "UEFA", "SUI": "UEFA", "AUT": "UEFA",
    "TUR": "UEFA", "SWE": "UEFA", "NOR": "UEFA", "SCO": "UEFA", "CZE": "UEFA",
    "BIH": "UEFA",
    # CONMEBOL
    "ARG": "CONMEBOL", "BRA": "CONMEBOL", "URY": "CONMEBOL", "COL": "CONMEBOL",
    "ECU": "CONMEBOL", "PAR": "CONMEBOL",
    # CONCACAF
    "USA": "CONCACAF", "MEX": "CONCACAF", "CAN": "CONCACAF", "PAN": "CONCACAF",
    "HAI": "CONCACAF", "CUW": "CONCACAF",
    # CAF
    "MAR": "CAF", "SEN": "CAF", "CIV": "CAF", "EGY": "CAF", "ALG": "CAF",
    "TUN": "CAF", "GHA": "CAF", "COD": "CAF", "RSA": "CAF", "CPV": "CAF",
    # AFC
    "JPN": "AFC", "KOR": "AFC", "IRN": "AFC", "AUS": "AFC", "KSA": "AFC",
    "QAT": "AFC", "IRQ": "AFC", "JOR": "AFC", "UZB": "AFC",
    # OFC
    "NZL": "OFC",
}
