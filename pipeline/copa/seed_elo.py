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
    "URU": 1895, "COL": 1875, "MAR": 1870, "SUI": 1850, "USA": 1845,
    "JPN": 1835, "MEX": 1820, "SEN": 1815, "AUT": 1810, "ECU": 1800,
    "TUR": 1800, "NOR": 1795, "KOR": 1790, "SWE": 1770, "ALG": 1765,
    "CZE": 1760, "CIV": 1760, "IRN": 1760, "EGY": 1755, "SCO": 1745,
    "PAR": 1745, "CAN": 1740, "AUS": 1730, "TUN": 1720, "BIH": 1710,
    "GHA": 1710, "COD": 1700, "UZB": 1675, "RSA": 1670, "PAN": 1660,
    "IRQ": 1660, "JOR": 1655, "KSA": 1650, "QAT": 1650, "NZL": 1620,
    "CPV": 1615, "HAI": 1585, "CUW": 1575,
}

SEED_NAMES: dict[str, str] = {
    "ALG": "Argélia", "ARG": "Argentina", "AUS": "Austrália", "AUT": "Áustria",
    "BEL": "Bélgica", "BIH": "Bósnia e Herzegovina", "BRA": "Brasil",
    "CAN": "Canadá", "CIV": "Costa do Marfim", "COD": "Congo (RD)",
    "COL": "Colômbia", "CPV": "Cabo Verde", "CRO": "Croácia", "CUW": "Curaçao",
    "CZE": "Tchéquia", "ECU": "Equador", "EGY": "Egito", "ENG": "Inglaterra",
    "ESP": "Espanha", "FRA": "França", "GER": "Alemanha", "GHA": "Gana",
    "HAI": "Haiti", "IRN": "Irã", "IRQ": "Iraque", "JOR": "Jordânia",
    "JPN": "Japão", "KOR": "Coreia do Sul", "KSA": "Arábia Saudita",
    "MAR": "Marrocos", "MEX": "México", "NED": "Holanda", "NOR": "Noruega",
    "NZL": "Nova Zelândia", "PAN": "Panamá", "PAR": "Paraguai",
    "POR": "Portugal", "QAT": "Catar", "RSA": "África do Sul", "SCO": "Escócia",
    "SEN": "Senegal", "SUI": "Suíça", "SWE": "Suécia", "TUN": "Tunísia",
    "TUR": "Turquia", "URU": "Uruguai", "USA": "Estados Unidos",
    "UZB": "Uzbequistão",
}

# Código flagcdn (ISO-3166 alpha-2, + subdivisões do Reino Unido).
# Bandeiras uniformes e que SEMPRE renderizam (https://flagcdn.com/<cod>.svg).
SEED_FLAG: dict[str, str] = {
    "ALG": "dz", "ARG": "ar", "AUS": "au", "AUT": "at", "BEL": "be",
    "BIH": "ba", "BRA": "br", "CAN": "ca", "CIV": "ci", "COD": "cd",
    "COL": "co", "CPV": "cv", "CRO": "hr", "CUW": "cw", "CZE": "cz",
    "ECU": "ec", "EGY": "eg", "ENG": "gb-eng", "ESP": "es", "FRA": "fr",
    "GER": "de", "GHA": "gh", "HAI": "ht", "IRN": "ir", "IRQ": "iq",
    "JOR": "jo", "JPN": "jp", "KOR": "kr", "KSA": "sa", "MAR": "ma",
    "MEX": "mx", "NED": "nl", "NOR": "no", "NZL": "nz", "PAN": "pa",
    "PAR": "py", "POR": "pt", "QAT": "qa", "RSA": "za", "SCO": "gb-sct",
    "SEN": "sn", "SUI": "ch", "SWE": "se", "TUN": "tn", "TUR": "tr",
    "URU": "uy", "USA": "us", "UZB": "uz",
}

SEED_CONF: dict[str, str] = {
    # UEFA
    "GER": "UEFA", "ESP": "UEFA", "FRA": "UEFA", "ENG": "UEFA", "POR": "UEFA",
    "NED": "UEFA", "BEL": "UEFA", "CRO": "UEFA", "SUI": "UEFA", "AUT": "UEFA",
    "TUR": "UEFA", "SWE": "UEFA", "NOR": "UEFA", "SCO": "UEFA", "CZE": "UEFA",
    "BIH": "UEFA",
    # CONMEBOL
    "ARG": "CONMEBOL", "BRA": "CONMEBOL", "URU": "CONMEBOL", "COL": "CONMEBOL",
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
