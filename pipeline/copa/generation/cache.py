"""Cache da geração de IA por hash de entrada.

Regra de ouro de custo: só chamamos a OpenAI quando as estatísticas de
entrada mudam. O hash das estatísticas é a chave. Se o hash já existe no
cache, reusamos o texto e não gastamos um token sequer.
"""

from __future__ import annotations

import hashlib
import json
from typing import Any

from copa import config


def input_hash(payload: dict[str, Any]) -> str:
    """Hash estável (sha1) de um dict de estatísticas de entrada."""
    canonical = json.dumps(payload, sort_keys=True, ensure_ascii=False, default=str)
    return hashlib.sha1(canonical.encode("utf-8")).hexdigest()[:16]


def _path(key: str):
    return config.CACHE_DIR / f"{key}.json"


def get(key: str) -> dict | None:
    """Recupera um artigo cacheado pelo hash, ou None."""
    path = _path(key)
    if not path.exists():
        return None
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, OSError):
        return None


def put(key: str, article: dict) -> None:
    """Salva um artigo no cache sob o hash."""
    config.CACHE_DIR.mkdir(parents=True, exist_ok=True)
    _path(key).write_text(
        json.dumps(article, ensure_ascii=False, indent=2), encoding="utf-8"
    )
