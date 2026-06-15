"""Leitura e escrita dos JSON em /data e cópia p/ web/public/data.

/data é a fonte única da verdade. O subconjunto que o simulador usa no
browser é copiado para web/public/data no fim do pipeline.
"""

from __future__ import annotations

import json
import shutil
from pathlib import Path
from typing import Any

from copa import config


def read_json(name: str) -> Any | None:
    """Lê data/<name> (ex: 'teams.json'). Retorna None se não existir."""
    path = config.DATA_DIR / name
    if not path.exists():
        return None
    return json.loads(path.read_text(encoding="utf-8"))


def write_json(name: str, data: Any) -> Path:
    """Escreve data/<name> com indentação estável (diffs limpos no Git)."""
    config.DATA_DIR.mkdir(parents=True, exist_ok=True)
    path = config.DATA_DIR / name
    path.write_text(
        json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    return path


def copy_client_data() -> None:
    """Copia os JSON que o simulador consome p/ web/public/data."""
    config.WEB_PUBLIC_DATA_DIR.mkdir(parents=True, exist_ok=True)
    for name in config.CLIENT_DATA_FILES:
        src = config.DATA_DIR / name
        if src.exists():
            shutil.copy2(src, config.WEB_PUBLIC_DATA_DIR / name)
