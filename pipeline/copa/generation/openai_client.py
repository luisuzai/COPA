"""Geração de análises em linguagem natural via OpenAI.

Fluxo de cada artigo:
  1. Calcula o hash das estatísticas de entrada.
  2. Se já existe no cache → reusa (custo zero).
  3. Senão → chama a OpenAI, parseia o JSON, salva no cache.

Se a OpenAI estiver desabilitada (sem chave), retorna None e o pipeline
segue normalmente — o site funciona, só sem os textos novos.
"""

from __future__ import annotations

import json
from datetime import datetime, timezone
from typing import Any

from copa import config
from copa.generation import cache, prompts


def _now() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def _call_openai(user_prompt: str) -> dict[str, str]:
    # Import tardio: a lib só é necessária quando a IA está ligada.
    from openai import OpenAI

    client = OpenAI(api_key=config.OPENAI_API_KEY)
    resp = client.chat.completions.create(
        model=config.OPENAI_MODEL,
        temperature=0.6,
        response_format={"type": "json_object"},
        messages=[
            {"role": "system", "content": prompts.SYSTEM_PROMPT},
            {"role": "user", "content": user_prompt},
        ],
    )
    content = resp.choices[0].message.content or "{}"
    return json.loads(content)


def generate_article(
    *,
    kind: str,
    slug: str,
    stats: dict[str, Any],
) -> dict | None:
    """Gera (ou recupera do cache) um artigo para uma entidade.

    `kind` ∈ {home, team, match, scenario}. `stats` é o dict de entrada que
    também serve de chave de cache. Retorna um Article (dict) ou None.
    """
    key = cache.input_hash({"kind": kind, "slug": slug, "stats": stats})

    cached = cache.get(key)
    if cached is not None:
        return cached

    if not config.OPENAI_ENABLED:
        return None

    user_prompt = prompts.PROMPT_BUILDERS[kind](stats)
    result = _call_openai(user_prompt)

    article = {
        "id": f"a-{kind}-{slug}",
        "slug": slug,
        "type": kind,
        "title": result.get("title", "").strip(),
        "summary": result.get("summary", "").strip(),
        "body": result.get("body", "").strip(),
        "generatedAt": _now(),
        "inputHash": key,
    }
    cache.put(key, article)
    return article
