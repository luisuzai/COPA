"""QA dos textos gerados: varre data/articles.json em busca de vazamentos.

Não corrige nada — só aponta. Roda depois da geração para conferir a qualidade.
Uso: python -m scripts.qa_articles
"""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path

try:
    sys.stdout.reconfigure(encoding="utf-8")
except (AttributeError, OSError):
    pass

ROOT = Path(__file__).resolve().parents[2]
ARTICLES = ROOT / "data" / "articles.json"

# Cada checagem: (rótulo, regex). Casa = problema.
CHECKS = [
    ("fase em código", re.compile(r"round_of_32|round_of_16|\bquarter\b|\bsemi\b|third_place")),
    ("jargão de modelo", re.compile(r"Monte Carlo|simula[çc]", re.IGNORECASE)),
    ("Elo cru", re.compile(r"\bELO\b|\bElo\b")),
    ("fração decimal", re.compile(r"\b0[.,]\d{2,}\b")),
    ("porcentagem com ponto", re.compile(r"\d+\.\d+\s*%")),
    ("heading markdown", re.compile(r"(^|\n)\s*#{1,6}\s")),
    # Só nomes que DIFEREM em pt-BR (evita falso-positivo com Argentina,
    # Portugal, Senegal etc., iguais nos dois idiomas).
    ("país em inglês", re.compile(
        r"\b(England|Netherlands|South Korea|Spain|Germany|Brazil|"
        r"France|Belgium|Croatia|Uruguay|Norway|Iraq|"
        r"Austria|Qatar|Ghana|Saudi Arabia|Switzerland|Sweden|Egypt|"
        r"Morocco|Japan|Colombia|Mexico|South Africa)\b")),
    ("placar quebrado", re.compile(r"\d+[.,]\d+\s*[ax×x]\s*\d+[.,]\d+")),
    ("jogador citado", re.compile(
        r"\b(Pelé|Neymar|Messi|Mbappé|Mbappe|Cristiano|Ronaldo|Vini|Vinícius|"
        r"Haaland|Griezmann)\b")),
    ("linguagem de aposta", re.compile(
        r"cota[çc][ãa]o|investidor|\bodds\b|mercado de aposta|favorito do mercado",
        re.IGNORECASE)),
    ("conceito errado (liga)", re.compile(r"rebaixa|pontos corridos|tabela do brasileir", re.IGNORECASE)),
    ("sede inventada", re.compile(r"est[áa]dio|stadium|\barena\b|refer[êe]ncia impl[íi]cita", re.IGNORECASE)),
]


def main() -> None:
    data = json.loads(ARTICLES.read_text(encoding="utf-8"))
    items = data["items"]
    print(f"Analisando {len(items)} artigos…\n")
    total = 0
    by_check: dict[str, int] = {}
    for art in items:
        text = f"{art.get('title','')}\n{art.get('summary','')}\n{art.get('body','')}"
        hits = []
        for label, rx in CHECKS:
            m = rx.search(text)
            if m:
                hits.append(f"{label} → '{m.group(0)}'")
                by_check[label] = by_check.get(label, 0) + 1
        if hits:
            total += 1
            print(f"⚠️  [{art['type']}] {art['slug']}")
            for h in hits:
                print(f"      {h}")
    print(f"\n{'─'*50}")
    print(f"Artigos com problema: {total}/{len(items)}")
    for label, n in sorted(by_check.items(), key=lambda x: -x[1]):
        print(f"  {n:>3}× {label}")


if __name__ == "__main__":
    main()
