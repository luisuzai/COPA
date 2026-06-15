# COPA — Análises da Copa do Mundo 2026

Portal estático de probabilidades, simulações e análises da Copa do Mundo,
no estilo FiveThirtyEight / Opta. **Sem backend, sem banco, sem servidor.**
Um pipeline Python roda localmente, gera JSON, e o Next.js publica HTML
estático no GitHub Pages.

```
┌── pipeline (Python, local) ──┐      ┌── web (Next.js, SSG) ──┐
│ ingestão → Elo → Monte Carlo │ JSON │  lê /data → HTML        │
│ → probabilidades → IA        │ ───► │  estático (GitHub Pages)│
└──────────────────────────────┘      └────────────────────────┘
```

- **OpenAI** só explica os números em texto — **nunca** calcula probabilidades.
- Estatística: **Elo** + **Monte Carlo** (100.000 simulações) em numpy.

## Estrutura

```
COPA/
├── data/            JSON gerados (fonte única da verdade, versionados)
├── pipeline/        Python: ingestão, estatística, IA
└── web/             Next.js 15 + Tailwind (export estático)
```

## Pré-requisitos

- **Python 3.10+** (testado em 3.10) — para o pipeline
- **Node.js 20+** — para a web ([nodejs.org](https://nodejs.org) ou `winget install OpenJS.NodeJS.LTS`)

## 1. Pipeline (gera os dados)

```bash
cd pipeline
python -m venv .venv && .venv\Scripts\activate    # Windows
pip install -e ".[dev]"

# Configurar chaves (apenas local — nunca commitado):
copy .env.example .env        # e preencha FOOTBALL_DATA_TOKEN e OPENAI_API_KEY

# Rodar:
python -m scripts.run                 # online (API) + IA
python -m scripts.run --offline       # usa /data, sem API
python -m scripts.run --no-ai         # sem gerar texto
python -m scripts.run --sims 100000   # nº de simulações

python -m pytest                      # testes do modelo
```

O pipeline escreve em `/data` e copia o subset do simulador p/ `web/public/data`.

### Publicar (commit + push dos dados)

```bash
python -m scripts.publish -m "rodada 2"
```

O push dispara o GitHub Actions, que builda e publica no GitHub Pages.

## 2. Web (renderiza o site)

```bash
cd web
npm install
npm run dev      # http://localhost:3000
npm run build    # gera /out (HTML estático)
```

> Em produção o site usa `basePath: '/COPA'` (página de projeto do GitHub
> Pages). Em dev o prefixo é vazio. Ajuste o nome do repo em
> `web/next.config.mjs` e a URL em `web/src/app/layout.tsx` se necessário.

## Segurança das chaves

As chaves (OpenAI, football-data) vivem **só** em `pipeline/.env`, ignorado
pelo Git. O GitHub Actions **não** usa nenhuma chave — ele só builda os JSON já
gerados. Não há como vazar a chave para produção. Ver `.gitignore`.

## Status do MVP

- [x] Pipeline: Elo, Monte Carlo, probabilidades, cenários, ingestão, IA + cache
- [x] Contrato de dados (TypeScript ↔ Python) e JSON de exemplo
- [x] Web: design system, layout, Home (favoritos)
- [ ] Páginas: seleção, confronto, grupo, cenários
- [ ] Simulador "what-if" (client-side)
- [ ] SEO (sitemap, robots, JSON-LD)
- [ ] GitHub Actions (build + deploy)
