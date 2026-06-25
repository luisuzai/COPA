"""Aplica textos escritos à mão no articles.json (e copia p/ web/public/data).

Lê data/.cache/_batch.json — {"items":[{kind,slug,title,summary,body}, ...]} —
pega o inputHash novo de data/.cache/_stale.json, monta o Article completo,
faz upsert em articles.json e copia para o cliente.

Uso: python -m scripts._apply_texts
"""
from __future__ import annotations

import json
import sys
from datetime import datetime, timezone

sys.stdout.reconfigure(encoding="utf-8")

from copa import serializers
from copa.generation.openai_client import _trim_summary, _trim_title

BATCH = "C:/Users/Luis Uzai/OneDrive/Documents/Coding/COPA/data/.cache/_batch.json"
STALE = "C:/Users/Luis Uzai/OneDrive/Documents/Coding/COPA/data/.cache/_stale.json"

now = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

with open(BATCH, encoding="utf-8") as f:
    batch = json.load(f)["items"]
with open(STALE, encoding="utf-8") as f:
    hash_of = {(s["kind"], s["slug"]): s["new"] for s in json.load(f)["items"]}

articles = serializers.read_json("articles.json") or {"items": []}
index = {(a["type"], a["slug"]): i for i, a in enumerate(articles["items"])}

applied = 0
missing_hash = []
for it in batch:
    kind, slug = it["kind"], it["slug"]
    h = hash_of.get((kind, slug))
    if h is None:
        missing_hash.append((kind, slug))
    art = {
        "id": f"a-{kind}-{slug}",
        "slug": slug,
        "type": kind,
        "title": _trim_title(it["title"].strip()),
        "summary": _trim_summary(it["summary"].strip()),
        "body": it["body"].strip(),
        "generatedAt": now,
        "inputHash": h or "",
    }
    if (kind, slug) in index:
        articles["items"][index[(kind, slug)]] = art
    else:
        articles["items"].append(art)
        index[(kind, slug)] = len(articles["items"]) - 1
    applied += 1

articles["generatedAt"] = now
serializers.write_json("articles.json", articles)
serializers.copy_client_data()
print(f"Aplicados: {applied}")
if missing_hash:
    print("⚠️ sem hash em _stale (não defasados?):", missing_hash)
