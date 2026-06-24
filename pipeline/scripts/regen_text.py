"""Regenera SÓ os textos das análises a partir dos JSONs já no disco.

Não re-roda ingestão nem Monte Carlo — reusa probabilities/predictions/
scenarios/rankings/teams/matches existentes em /data. Como os inputs ficam
idênticos ao último run, os artigos já gerados batem no cache (custo zero) e só
os que faltam/falharam são gerados. Ideal para iterar no prompt sem re-simular.

Uso: python -m scripts.regen_text
"""

from __future__ import annotations

import sys

from dotenv import load_dotenv

try:
    sys.stdout.reconfigure(encoding="utf-8")
    sys.stderr.reconfigure(encoding="utf-8")
except (AttributeError, OSError):
    pass

load_dotenv(override=True)


def main() -> None:
    from copa import serializers
    from copa.pipeline import _build_articles

    teams = serializers.read_json("teams.json")
    matches = serializers.read_json("matches.json")
    probabilities = serializers.read_json("probabilities.json")
    predictions = serializers.read_json("predictions.json")
    scenarios = serializers.read_json("scenarios.json")
    rankings = serializers.read_json("rankings.json")
    if not all([teams, matches, probabilities, predictions, scenarios, rankings]):
        raise SystemExit("Faltam JSONs em /data. Rode o pipeline completo antes.")

    print("✍️  Regenerando textos a partir dos dados em /data…")
    articles = _build_articles(
        teams, matches, probabilities, predictions, scenarios, rankings, no_ai=False
    )
    serializers.write_json("articles.json", articles)
    serializers.copy_client_data()
    print(f"✅ {len(articles['items'])} artigos escritos.")


if __name__ == "__main__":
    main()
