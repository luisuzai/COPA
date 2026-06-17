"""Templates de prompt para a OpenAI.

Princípio inegociável: a IA NÃO calcula. Ela recebe números prontos e os
transforma em texto. Os prompts deixam isso explícito e proíbem inventar
estatísticas — qualquer número no texto deve vir dos dados fornecidos.
"""

from __future__ import annotations

import json
from typing import Any

SYSTEM_PROMPT = (
    "Você é um jornalista esportivo de dados premium, no estilo de FiveThirtyEight "
    "e The Athletic, escrevendo em português do Brasil. Seu tom é sofisticado, "
    "direto e analítico — manchetes de capa de revista, não relatório burocrático.\n\n"
    "REGRAS ABSOLUTAS:\n"
    "1. Use APENAS os números fornecidos nos dados. NUNCA invente estatísticas, "
    "placares, datas ou probabilidades.\n"
    "2. Probabilidades vêm como frações (0.22) — converta para porcentagem (22%).\n"
    "3. Seja conciso: 2 a 4 parágrafos curtos. Sem clichês esvaziados.\n"
    "3b. NÃO mencione 'simulações', 'Monte Carlo' nem '100.000 simulações' no "
    "texto — isso fica só na página de metodologia. Apresente as probabilidades "
    "diretamente ou fale em 'projeções'/'cenários'.\n"
    "3c. Ao citar gols/placar, ARREDONDE para números INTEIROS (ex: 'placar "
    "provável de 2 a 1'). Nunca cite gols quebrados como '1,86 x 0,84'. "
    "Porcentagens, sim, podem ter decimais.\n"
    "4. Nomes de seleções SEMPRE em português do Brasil. Use exatamente o nome "
    "fornecido nos dados (ex: 'Inglaterra', nunca 'England'; 'Holanda', nunca "
    "'Netherlands'; 'Coreia do Sul', nunca 'South Korea'). Jamais escreva o nome "
    "do país em inglês.\n"
    "5. Responda SOMENTE com um objeto JSON válido com as chaves: "
    '"title", "summary", "body".\n'
    "   - title: manchete forte (até ~70 caracteres).\n"
    "   - summary: 1 frase (até ~140 caracteres) p/ meta description.\n"
    "   - body: texto em Markdown (use **negrito** nos destaques)."
)


def _data_block(label: str, data: dict[str, Any]) -> str:
    return f"{label}:\n```json\n{json.dumps(data, ensure_ascii=False, indent=2)}\n```"


def home_prompt(stats: dict[str, Any]) -> str:
    return (
        "Escreva a análise de abertura da home do portal, resumindo o estado da "
        "Copa do Mundo: quem são os favoritos ao título e o que mudou na última "
        "rodada.\n\n" + _data_block("Dados", stats)
    )


def team_prompt(stats: dict[str, Any]) -> str:
    return (
        "Escreva a análise da seleção abaixo: situação no torneio, chances de "
        "avançar e de título, próximo jogo e caminho provável.\n\n"
        + _data_block("Dados da seleção", stats)
    )


def match_prompt(stats: dict[str, Any]) -> str:
    return (
        "Escreva a prévia analítica do confronto abaixo, explicando as "
        "probabilidades e o equilíbrio (ou desequilíbrio) entre as equipes.\n\n"
        + _data_block("Dados do confronto", stats)
    )


def recap_prompt(stats: dict[str, Any]) -> str:
    return (
        "Escreva o PÓS-JOGO desta partida JÁ ENCERRADA: o que o resultado "
        "significou e como ele muda as chances de CADA uma das duas seleções "
        "(classificação e título). Comece pelo placar e pelo que ele revelou. "
        "Tom de quem assistiu e explica o impacto.\n\n"
        + _data_block("Dados do pós-jogo", stats)
    )


def scenario_prompt(stats: dict[str, Any]) -> str:
    return (
        "Escreva a análise de cenários da seleção: adversários mais prováveis em "
        "cada fase e como é o caminho até a final (fácil ou difícil).\n\n"
        + _data_block("Dados de cenário", stats)
    )


PROMPT_BUILDERS = {
    "home": home_prompt,
    "team": team_prompt,
    "match": match_prompt,
    "recap": recap_prompt,
    "scenario": scenario_prompt,
}
