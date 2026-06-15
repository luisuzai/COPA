"""Commit e push automáticos dos dados gerados.

Adiciona apenas /data e web/public/data (nunca o .env). Faz commit com
timestamp e dá push — o GitHub Actions cuida do build e do deploy.

Uso:
    python -m scripts.publish
    python -m scripts.publish --message "rodada 2 finalizada"
"""

from __future__ import annotations

import argparse
import subprocess
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
PATHS = ["data", "web/public/data"]


def _git(*args: str) -> subprocess.CompletedProcess:
    return subprocess.run(["git", *args], cwd=ROOT, capture_output=True, text=True)


def main() -> None:
    parser = argparse.ArgumentParser(description="Publica os dados gerados")
    parser.add_argument("--message", "-m", default=None, help="mensagem do commit")
    parser.add_argument("--no-push", action="store_true", help="commita sem dar push")
    args = parser.parse_args()

    _git("add", *PATHS)

    status = _git("status", "--porcelain", *PATHS)
    if not status.stdout.strip():
        print("Nada a publicar — dados sem alterações.")
        return

    stamp = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
    message = args.message or f"data: atualização da Copa ({stamp})"
    commit = _git("commit", "-m", message)
    print(commit.stdout or commit.stderr)

    if args.no_push:
        print("Commit feito (push pulado por --no-push).")
        return

    push = _git("push")
    print(push.stdout or push.stderr)
    print("✅ Publicado. O GitHub Actions fará o build e o deploy.")


if __name__ == "__main__":
    main()
