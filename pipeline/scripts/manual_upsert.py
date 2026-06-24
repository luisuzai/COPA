"""Upsert de artigos escritos à mão em data/articles.json.

Lê data/.cache/batch.json (lista de artigos com id/slug/type/title/summary/body),
preenche generatedAt + inputHash (hash dos stats reais em manual_stats.json, igual
ao do pipeline) e faz upsert por id. Copia para web/public/data ao final.

Uso: python -m scripts.manual_upsert
"""

from __future__ import annotations

import json
import shutil
import sys
from datetime import datetime, timezone

from copa import config
from copa.generation import cache

try:
    sys.stdout.reconfigure(encoding="utf-8")
except (AttributeError, OSError):
    pass

ROOT = config.ROOT_DIR
now = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

stats = {
    (x["kind"], x["slug"]): x["stats"]
    for x in json.loads((ROOT / "data/.cache/manual_stats.json").read_text("utf-8"))
}
batch = json.loads((ROOT / "data/.cache/batch.json").read_text("utf-8"))
doc = json.loads((ROOT / "data/articles.json").read_text("utf-8"))
by_id = {a["id"]: a for a in doc["items"]}

for a in batch:
    st = stats.get((a["type"], a["slug"]))
    a["generatedAt"] = now
    a["inputHash"] = cache.input_hash(
        {"kind": a["type"], "slug": a["slug"], "stats": st}
    ) if st else a.get("inputHash", "")
    by_id[a["id"]] = a

doc["items"] = list(by_id.values())
(ROOT / "data/articles.json").write_text(
    json.dumps(doc, ensure_ascii=False, indent=2), "utf-8"
)
shutil.copy(ROOT / "data/articles.json", ROOT / "web/public/data/articles.json")
print(f"upserted {len(batch)} | total {len(doc['items'])}")
