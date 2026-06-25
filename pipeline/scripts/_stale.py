"""Lista artigos cujo inputHash mudou (stats novas) — i.e., os que precisam
ser reescritos. Despeja as stats de cada um em data/.cache/_stale.json.

Uso: python -m scripts._stale
"""
from __future__ import annotations

import json
import sys

sys.stdout.reconfigure(encoding="utf-8")

from copa import serializers
from copa.generation.cache import input_hash
from copa.pipeline import (
    SCENARIO_TOP_N,
    _build_articles,  # noqa: F401 (garante import do módulo)
    _difficulty_labeler,
    _home_stats,
    _match_stats,
    _recap_stats,
    _scenario_stats,
    _team_stats,
    _team_by_id,
)

teams = serializers.read_json("teams.json")
matches = serializers.read_json("matches.json")
probabilities = serializers.read_json("probabilities.json")
predictions = serializers.read_json("predictions.json")
scenarios = serializers.read_json("scenarios.json")
rankings = serializers.read_json("rankings.json")
articles = serializers.read_json("articles.json") or {"items": []}

by_id = _team_by_id(teams)
hash_of = {(a["type"], a["slug"]): a.get("inputHash") for a in articles["items"]}
difficulty_label = _difficulty_labeler(scenarios)

tasks: list[tuple[str, str, dict]] = []
tasks.append(("home", "home", _home_stats(teams, probabilities, rankings, matches)))
for team in teams:
    tasks.append(("team", team["slug"],
                  _team_stats(team, teams, matches, probabilities, predictions, scenarios)))
for pred in predictions["matches"]:
    tasks.append(("match", pred["matchSlug"], _match_stats(pred, teams, matches)))
for m in matches:
    if m["status"] == "finished" and m.get("homeScore") is not None:
        tasks.append(("recap", m["slug"], _recap_stats(m, teams, probabilities)))
for scen in scenarios["teams"]:
    tasks.append(("scenario", by_id[scen["teamId"]]["slug"],
                  _scenario_stats(scen, teams, by_id, difficulty_label)))

stale = []
counts: dict[str, int] = {}
for kind, slug, stats in tasks:
    new_hash = input_hash({"kind": kind, "slug": slug, "stats": stats})
    old_hash = hash_of.get((kind, slug))
    if new_hash != old_hash:
        stale.append({"kind": kind, "slug": slug, "stats": stats,
                      "old": old_hash, "new": new_hash,
                      "existed": (kind, slug) in hash_of})
        counts[kind] = counts.get(kind, 0) + 1

print("Total tarefas:", len(tasks))
print("Defasados:", len(stale), "por tipo:", counts)
print("Novos (sem artigo):", sum(1 for s in stale if not s["existed"]))
out = "C:/Users/Luis Uzai/OneDrive/Documents/Coding/COPA/data/.cache/_stale.json"
with open(out, "w", encoding="utf-8") as f:
    json.dump({"items": stale}, f, ensure_ascii=False, indent=2)
print("Stats despejadas em", out)
print("\nLista:")
for s in stale:
    tag = "NOVO" if not s["existed"] else "upd"
    print(f"  [{tag}] {s['kind']}/{s['slug']}")
