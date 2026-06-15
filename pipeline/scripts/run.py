"""Ponto de entrada do pipeline.

Uso:
    python -m scripts.run                # online (precisa do token) + IA
    python -m scripts.run --offline      # usa /data, sem chamar a API
    python -m scripts.run --no-ai        # pula a geração de texto
    python -m scripts.run --sims 50000   # nº de simulações Monte Carlo

Carrega o .env ANTES de importar a config (que lê as variáveis na importação).
"""

from __future__ import annotations

import argparse
import sys

from dotenv import load_dotenv

# Console do Windows pode ser cp1252; garante que emojis nos logs não quebrem.
try:
    sys.stdout.reconfigure(encoding="utf-8")
    sys.stderr.reconfigure(encoding="utf-8")
except (AttributeError, OSError):
    pass

load_dotenv()  # carrega pipeline/.env (chaves locais) — deve vir antes de copa.*


def main() -> None:
    parser = argparse.ArgumentParser(description="Pipeline COPA")
    parser.add_argument("--offline", action="store_true", help="usa /data, não chama a API")
    parser.add_argument("--no-ai", action="store_true", help="pula a geração de IA")
    parser.add_argument("--sims", type=int, default=None, help="nº de simulações")
    args = parser.parse_args()

    from copa import config
    from copa.pipeline import run

    run(
        offline=args.offline,
        no_ai=args.no_ai,
        n_sims=args.sims or config.SIMULATIONS,
    )


if __name__ == "__main__":
    main()
