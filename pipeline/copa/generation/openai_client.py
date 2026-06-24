"""Geração de análises em linguagem natural (OpenAI ou modelo local via Ollama).

Fluxo de cada artigo:
  1. Calcula o hash das estatísticas de entrada.
  2. Se já existe no cache → reusa (custo zero).
  3. Senão → chama o modelo, parseia a resposta em Markdown, salva no cache.

Dois back-ends:
  - OpenAI oficial (sem OPENAI_BASE_URL): usa o SDK openai.
  - Ollama local (OPENAI_BASE_URL setado): usa a API NATIVA do Ollama
    (/api/chat). Motivo: o endpoint OpenAI-compatível do Ollama NÃO permite
    desligar o "thinking" do Qwen3.x — sem isso o modelo gasta todo o limite de
    tokens raciocinando e devolve conteúdo vazio. A API nativa expõe `think:false`.

SAÍDA EM MARKDOWN (não JSON): modelos pequenos são frágeis ao montar JSON com um
corpo de vários parágrafos (escapam mal quebras de linha, esquecem aspas). Pedir
Markdown estruturado (# título, ## Resumo, ## Análise) é mais natural para eles e
o parsing por regex é à prova de quebras/aspas/markdown no corpo.

Se a IA estiver desabilitada (sem chave e sem endpoint), retorna None e o
pipeline segue normalmente — o site funciona, só sem os textos novos.
"""

from __future__ import annotations

import json
import re
import urllib.request
from datetime import datetime, timezone
from typing import Any

from tqdm import tqdm

from copa import config
from copa.generation import cache, prompts

_SCORELINE = re.compile(r"\b(\d+)\s*(?:a|x|×)\s*(\d+)\b")
_KNOCKOUT = re.compile(r"oitava|quarta|semifinal|mata-?mata", re.IGNORECASE)

# Termos proibidos: conceitos de liga (não existem em Copa), linguagem de aposta
# e jargão de modelagem. Se aparecerem, regeramos o texto.
_FORBIDDEN = re.compile(
    r"rebaixa|pontos corridos|cota[çc][ãa]o|\bodds\b|investidor|"
    r"monte\s*carlo|simula[çc]|est[áa]dio|stadium|\barena\b|"
    r"refer[êe]ncia impl[íi]cita",
    re.IGNORECASE,
)

# Normalização de nomes que o modelo às vezes escreve em inglês. Substituição
# determinística e segura (palavra inteira). Compostos primeiro.
_PT_NAMES = {
    "Saudi Arabia": "Arábia Saudita", "South Korea": "Coreia do Sul",
    "North Korea": "Coreia do Norte", "South Africa": "África do Sul",
    "United States": "Estados Unidos", "Cape Verde": "Cabo Verde",
    "Ivory Coast": "Costa do Marfim", "Netherlands": "Holanda",
    "Switzerland": "Suíça", "England": "Inglaterra", "Germany": "Alemanha",
    "Spain": "Espanha", "Brazil": "Brasil", "France": "França",
    "Belgium": "Bélgica", "Croatia": "Croácia", "Uruguay": "Uruguai",
    "Norway": "Noruega", "Iraq": "Iraque", "Austria": "Áustria",
    "Ghana": "Gana", "Egypt": "Egito", "Morocco": "Marrocos",
    "Japan": "Japão", "Colombia": "Colômbia", "Mexico": "México",
    "Sweden": "Suécia", "Qatar": "Catar", "Czechia": "Tchéquia",
    "Wales": "País de Gales", "Scotland": "Escócia", "Denmark": "Dinamarca",
    "Poland": "Polônia", "Turkey": "Turquia", "Curacao": "Curaçao",
}
_NAME_RE = [
    (re.compile(rf"\b{re.escape(en)}\b"), pt)
    for en, pt in sorted(_PT_NAMES.items(), key=lambda kv: -len(kv[0]))
]


def _normalize_names(text: str) -> str:
    for rx, pt in _NAME_RE:
        text = rx.sub(pt, text)
    return text


def _valid_output(result: dict) -> bool:
    """Reprova textos com termos proibidos (liga/aposta/jargão) ou inglês vazado."""
    blob = f"{result.get('title', '')} {result.get('summary', '')} {result.get('body', '')}"
    return not _FORBIDDEN.search(blob) and not _ENGLISH.search(blob)

# Limite de tokens da resposta e temperatura (modelo local). Folga suficiente
# para os textos mais longos (cenário/home) sem desperdício. Temperatura um
# pouco mais alta dá variedade lexical (menos repetição de muletas).
_NUM_PREDICT = 1200
_TEMPERATURE = 0.5

# Limites editoriais (premium): título de manchete e resumo de meta description.
_TITLE_MAX = 70
_SUMMARY_MAX = 155


def _trim_summary(text: str, limit: int = _SUMMARY_MAX) -> str:
    """Garante um resumo dentro do limite de meta description, cortando no fim
    de frase mais próximo; se não houver, na última palavra, com reticências."""
    text = text.strip()
    if len(text) <= limit:
        return text
    cut = text[:limit]
    end = max(cut.rfind(". "), cut.rfind("! "), cut.rfind("? "))
    if end >= limit * 0.55:
        return cut[: end + 1].strip()
    sp = cut.rfind(" ")
    return (cut[:sp].rstrip(" ,;:–-") + "…") if sp > 0 else cut.strip()


# Conectores soltos que não podem terminar um título cortado ("...mínima de").
_TRAIL_WORD = re.compile(
    r"[\s,;:–-]+(?:de|da|do|das|dos|e|a|o|as|os|um|uma|no|na|nos|nas|em|com|"
    r"para|por|que|ao|aos|à|às|sobre|entre|sem|até|contra|rumo|após|diante|"
    r"frente|perante|sob|desde|numa?|nuns?|seu|sua|seus|suas)$",
    re.IGNORECASE,
)

# Palavras em inglês que vazam no texto (deveria ser tudo pt-BR). Conjunto
# pequeno e seguro: termos que não aparecem em português legítimo.
_ENGLISH = re.compile(
    r"\b(the|with|and|against|hopes|title hopes|draw|wins|"
    r"group stage|knockout|round of)\b",
    re.IGNORECASE,
)


def _trim_title(text: str, limit: int = _TITLE_MAX) -> str:
    """Garante um título de manchete dentro do limite, cortando na última
    palavra. SEMPRE remove conector solto no fim (um título nunca deve terminar
    em 'de/a/com…'), mesmo que já esteja curto — sem reticências."""
    text = text.strip().rstrip(".")
    if len(text) > limit:
        cut = text[:limit]
        sp = cut.rfind(" ")
        text = cut[:sp] if sp > 0 else cut
    text = text.rstrip(" ,;:–-")
    prev = None
    while prev != text:  # remove conectores soltos encadeados no fim
        prev = text
        text = _TRAIL_WORD.sub("", text).rstrip(" ,;:–-")
    return text

# Parsing da resposta em Markdown.
_RE_TITLE = re.compile(r"^\s{0,3}#\s+(.+?)\s*$", re.MULTILINE)
_RE_SUMMARY = re.compile(
    r"^\s{0,3}##\s*resumo\s*$\n+(.+?)(?=\n\s{0,3}##\s|\Z)",
    re.IGNORECASE | re.MULTILINE | re.DOTALL,
)
_RE_BODY = re.compile(
    r"^\s{0,3}##\s*(?:análise|analise|corpo)\s*$\n+(.+)\Z",
    re.IGNORECASE | re.MULTILINE | re.DOTALL,
)


def _clean(text: str) -> str:
    """Remove **negrito**/*itálico*/aspas que o modelo às vezes põe num título."""
    return text.strip().strip("*").strip().strip('"').strip()


def _parse_markdown(text: str) -> dict[str, str]:
    """Extrai título (# …), resumo (## Resumo) e corpo (## Análise) da resposta."""
    mt = _RE_TITLE.search(text)
    ms = _RE_SUMMARY.search(text)
    mb = _RE_BODY.search(text)
    return {
        "title": _clean(mt.group(1)) if mt else "",
        "summary": _clean(ms.group(1)) if ms else "",
        "body": mb.group(1).strip() if mb else "",
    }


def _valid_recap(stats: dict, result: dict) -> bool:
    """Rede de segurança determinística para o pós-jogo (o tipo mais sensível):
    o placar exato é conhecido, então o título/resumo NÃO podem citar um placar
    diferente nem inventar fase de mata-mata quando o jogo foi de grupos."""
    m = re.search(r"(\d+)\s*x\s*(\d+)", stats.get("placar", ""))
    if not m:
        return True
    real = (m.group(1), m.group(2))
    head = f"{result.get('title', '')} {result.get('summary', '')}"
    for a, b in _SCORELINE.findall(head):
        if (a, b) != real and (b, a) != real:
            return False
    if (stats.get("fase") or "").lower().startswith("grupo") and _KNOCKOUT.search(head):
        return False
    # Variedade: pós-jogo não pode abrir sempre por "O placar/resultado…".
    if re.match(r"^\s*(?:o|um)\s+(?:placar|resultado)\b",
                result.get("body", ""), re.IGNORECASE):
        return False
    return True


def _now() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def _call_ollama(user_prompt: str) -> dict[str, str]:
    """Chama a API nativa do Ollama com thinking desligado; saída em Markdown."""
    base = config.OPENAI_BASE_URL.rstrip("/")
    if base.endswith("/v1"):
        base = base[:-3]
    url = base.rstrip("/") + "/api/chat"
    payload = {
        "model": config.OPENAI_MODEL,
        "think": False,  # Qwen3.x raciocina por padrão e estoura o limite.
        "stream": False,
        "options": {"num_predict": _NUM_PREDICT, "temperature": _TEMPERATURE},
        "messages": [
            {"role": "system", "content": prompts.SYSTEM_PROMPT},
            {"role": "user", "content": user_prompt},
        ],
    }
    req = urllib.request.Request(
        url,
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json"},
    )
    with urllib.request.urlopen(req, timeout=180) as resp:
        data = json.load(resp)
    return _parse_markdown(data["message"]["content"] or "")


def _call_openai(user_prompt: str) -> dict[str, str]:
    # Import tardio: a lib só é necessária quando a IA está ligada.
    from openai import OpenAI

    client = OpenAI(api_key=config.OPENAI_API_KEY or "not-needed")
    resp = client.chat.completions.create(
        model=config.OPENAI_MODEL,
        # Sem temperature explícito: alguns modelos (gpt-5.x) só aceitam o default.
        messages=[
            {"role": "system", "content": prompts.SYSTEM_PROMPT},
            {"role": "user", "content": user_prompt},
        ],
    )
    return _parse_markdown(resp.choices[0].message.content or "")


def _call_model(user_prompt: str) -> dict[str, str]:
    """Despacha para o Ollama local (se houver base_url) ou para a OpenAI."""
    if config.OPENAI_BASE_URL:
        return _call_ollama(user_prompt)
    return _call_openai(user_prompt)


def generate_article(
    *,
    kind: str,
    slug: str,
    stats: dict[str, Any],
) -> dict | None:
    """Gera (ou recupera do cache) um artigo para uma entidade.

    `kind` ∈ {home, team, match, recap, scenario}. `stats` é o dict de entrada
    que também serve de chave de cache. Retorna um Article (dict) ou None.
    """
    key = cache.input_hash({"kind": kind, "slug": slug, "stats": stats})

    cached = cache.get(key)
    if cached is not None:
        return cached

    if not config.OPENAI_ENABLED:
        return None

    user_prompt = prompts.PROMPT_BUILDERS[kind](stats)
    # Geração local é grátis, então re-tentamos com folga (só os textos teimosos
    # — termo proibido insistente — usam todas as tentativas). O recap valida
    # também o placar/fase, por isso ganha uma a mais.
    attempts = 6 if kind == "recap" else 5
    result, title, body = {}, "", ""
    for i in range(attempts):
        last = i == attempts - 1
        try:
            result = _call_model(user_prompt)
        except Exception as exc:  # erro de rede etc. → tenta de novo.
            if last:
                tqdm.write(f"  ⚠️  Falha ao gerar {kind}/{slug}: {exc}")
                return None
            continue
        # Normaliza nomes em inglês antes de validar e cachear.
        for k in ("title", "summary", "body"):
            if result.get(k):
                result[k] = _normalize_names(result[k])
        title = (result.get("title") or "").strip()
        body = (result.get("body") or "").strip()
        if not title or not body:
            continue
        # Tamanho NÃO entra no retry: o corte determinístico (_trim_*) já garante
        # os limites. Só regeramos por conteúdo (placar/fase do recap, proibidos).
        recap_ok = kind != "recap" or _valid_recap(stats, result)
        if recap_ok and _valid_output(result):
            break
        if not last:
            tqdm.write(f"  ↻ {kind}/{slug} reprovado (regra de conteúdo) — refazendo.")

    if not title or not body:  # esgotou as tentativas → mantém o anterior.
        tqdm.write(f"  ⚠️  Sem resposta válida para {kind}/{slug} — pulando.")
        return None

    article = {
        "id": f"a-{kind}-{slug}",
        "slug": slug,
        "type": kind,
        "title": _trim_title(title),
        "summary": _trim_summary((result.get("summary") or "").strip()),
        "body": body,
        "generatedAt": _now(),
        "inputHash": key,
    }
    cache.put(key, article)
    return article
