/**
 * Chaveamento OFICIAL da Copa do Mundo 2026 — estrutura + matemática de jogo.
 *
 * Fonte: chave oficial da FIFA (jogos 73–104). O cruzamento vencedor × vice é
 * EXATAMENTE o oficial. A única aproximação é QUAL 3º colocado ocupa cada vaga:
 * a FIFA resolve por uma tabela fixa de combinações; aqui resolvemos por
 * emparelhamento respeitando, para cada vaga, o conjunto de grupos permitidos
 * (THIRD_SLOTS) — fiel e válido, e só afeta as quartas em diante.
 *
 * Este módulo só descreve a chave e a probabilidade de um jogo. A SIMULAÇÃO
 * (Monte Carlo) que usa tudo isto vive em lib/scenarios.ts.
 */

import type { GroupId, Stage } from "@/lib/types";

// ──────────────────────────────────────────────────────────────
//  Matemática de jogo (réplica de copa/models/elo.py)
// ──────────────────────────────────────────────────────────────
const BASE_GOALS = 1.35;
const ELO_PER_GOAL = 250;
const MIN_EXPECTED_GOALS = 0.15;
const MAX_GOALS_GRID = 12;

/** Gols esperados (lambda Poisson) de cada lado, derivados do Elo. */
export function expectedGoals(eloA: number, eloB: number): [number, number] {
  const supremacy = (eloA - eloB) / ELO_PER_GOAL;
  return [
    Math.max(MIN_EXPECTED_GOALS, BASE_GOALS + supremacy / 2),
    Math.max(MIN_EXPECTED_GOALS, BASE_GOALS - supremacy / 2),
  ];
}

/** Vetor P(0..max) de uma Poisson de média lam. */
function poissonPmf(lam: number, max: number): number[] {
  const out = [Math.exp(-lam)];
  for (let k = 1; k <= max; k++) out.push((out[k - 1] * lam) / k);
  return out;
}

/**
 * Probabilidade de A avançar contra B num jogo único: vitória no tempo normal
 * (gols Poisson derivados do Elo) + empate decidido nos pênaltis como 50/50.
 */
export function advanceProbability(eloA: number, eloB: number): number {
  const [la, lb] = expectedGoals(eloA, eloB);
  const pa = poissonPmf(la, MAX_GOALS_GRID);
  const pb = poissonPmf(lb, MAX_GOALS_GRID);
  let homeWin = 0;
  let draw = 0;
  let awayWin = 0;
  for (let i = 0; i <= MAX_GOALS_GRID; i++) {
    for (let j = 0; j <= MAX_GOALS_GRID; j++) {
      const p = pa[i] * pb[j];
      if (i > j) homeWin += p;
      else if (i < j) awayWin += p;
      else draw += p;
    }
  }
  const total = homeWin + draw + awayWin;
  return (homeWin + 0.5 * draw) / total;
}

// ──────────────────────────────────────────────────────────────
//  Estrutura oficial da chave (jogos 73–104)
// ──────────────────────────────────────────────────────────────

/**
 * Origem de um lado de um confronto:
 *  - { kind: "winner"|"runner", group }  → 1º/2º colocado de um grupo
 *  - { kind: "third", slot }             → 3º colocado alocado a esta vaga
 *  - { kind: "match", match }            → vencedor de outro jogo (W<n>)
 */
export type Source =
  | { kind: "winner"; group: GroupId }
  | { kind: "runner"; group: GroupId }
  | { kind: "third"; slot: number }
  | { kind: "match"; match: number };

const w = (group: GroupId): Source => ({ kind: "winner", group });
const r = (group: GroupId): Source => ({ kind: "runner", group });
const m = (match: number): Source => ({ kind: "match", match });
const third = (slot: number): Source => ({ kind: "third", slot });

export interface BracketMatch {
  stage: Stage;
  a: Source;
  b: Source;
}

/** Fases do mata-mata, da primeira à final. */
export const KO_STAGES: Stage[] = [
  "round_of_32",
  "round_of_16",
  "quarter",
  "semi",
  "final",
];

/**
 * Os 8 jogos das 16-avos que recebem um 3º colocado, com o conjunto de grupos
 * que a FIFA permite naquela vaga. A chave é o número do jogo.
 */
export const THIRD_SLOTS: Record<number, GroupId[]> = {
  74: ["a", "b", "c", "d", "f"],
  77: ["c", "d", "f", "g", "h"],
  79: ["c", "e", "f", "h", "i"],
  80: ["e", "h", "i", "j", "k"],
  81: ["b", "e", "f", "i", "j"],
  82: ["a", "e", "h", "i", "j"],
  85: ["e", "f", "g", "i", "j"],
  87: ["d", "e", "i", "j", "l"],
};

/** Chave oficial 2026: número do jogo → seus dois lados. */
export const BRACKET: Record<number, BracketMatch> = {
  // ── 16-avos (round_of_32) ──────────────────────────────────
  73: { stage: "round_of_32", a: r("a"), b: r("b") },
  74: { stage: "round_of_32", a: w("e"), b: third(74) },
  75: { stage: "round_of_32", a: w("f"), b: r("c") },
  76: { stage: "round_of_32", a: w("c"), b: r("f") },
  77: { stage: "round_of_32", a: w("i"), b: third(77) },
  78: { stage: "round_of_32", a: r("e"), b: r("i") },
  79: { stage: "round_of_32", a: w("a"), b: third(79) },
  80: { stage: "round_of_32", a: w("l"), b: third(80) },
  81: { stage: "round_of_32", a: w("d"), b: third(81) },
  82: { stage: "round_of_32", a: w("g"), b: third(82) },
  83: { stage: "round_of_32", a: r("k"), b: r("l") },
  84: { stage: "round_of_32", a: w("h"), b: r("j") },
  85: { stage: "round_of_32", a: w("b"), b: third(85) },
  86: { stage: "round_of_32", a: w("j"), b: r("h") },
  87: { stage: "round_of_32", a: w("k"), b: third(87) },
  88: { stage: "round_of_32", a: r("d"), b: r("g") },
  // ── Oitavas (round_of_16) ──────────────────────────────────
  89: { stage: "round_of_16", a: m(74), b: m(77) },
  90: { stage: "round_of_16", a: m(73), b: m(75) },
  91: { stage: "round_of_16", a: m(76), b: m(78) },
  92: { stage: "round_of_16", a: m(79), b: m(80) },
  93: { stage: "round_of_16", a: m(83), b: m(84) },
  94: { stage: "round_of_16", a: m(81), b: m(82) },
  95: { stage: "round_of_16", a: m(86), b: m(88) },
  96: { stage: "round_of_16", a: m(85), b: m(87) },
  // ── Quartas (quarter) ──────────────────────────────────────
  97: { stage: "quarter", a: m(89), b: m(90) },
  98: { stage: "quarter", a: m(93), b: m(94) },
  99: { stage: "quarter", a: m(91), b: m(92) },
  100: { stage: "quarter", a: m(95), b: m(96) },
  // ── Semis (semi) ───────────────────────────────────────────
  101: { stage: "semi", a: m(97), b: m(98) },
  102: { stage: "semi", a: m(99), b: m(100) },
  // ── Final ──────────────────────────────────────────────────
  104: { stage: "final", a: m(101), b: m(102) },
};

/** Jogos do mata-mata em ordem (resolver nesta ordem garante dependências prontas). */
export const KO_MATCHES: number[] = Object.keys(BRACKET)
  .map(Number)
  .sort((a, b) => a - b);

/** Os 16 jogos das 16-avos. */
export const ROUND_OF_32: number[] = KO_MATCHES.filter(
  (n) => BRACKET[n].stage === "round_of_32",
);

// ──────────────────────────────────────────────────────────────
//  Alocação dos 3º colocados às vagas (emparelhamento determinístico)
// ──────────────────────────────────────────────────────────────

/**
 * Casa cada 3º classificado com uma vaga cujo conjunto de grupos permitidos
 * o aceite, um-para-um (matching bipartido por caminhos aumentantes — Kuhn).
 * `thirdGroups` vem ordenado (melhor 3º primeiro); vagas em ordem de jogo.
 * Retorna: nº do jogo (vaga) → índice em `thirdGroups`.
 */
export function assignThirds(thirdGroups: GroupId[]): Record<number, number> {
  const slots = Object.keys(THIRD_SLOTS).map(Number).sort((x, y) => x - y);
  const occupantOfSlot: Record<number, number> = {}; // slot → índice do 3º

  const tryAssign = (ti: number, seen: Set<number>): boolean => {
    const group = thirdGroups[ti];
    for (const slot of slots) {
      if (!THIRD_SLOTS[slot].includes(group) || seen.has(slot)) continue;
      seen.add(slot);
      if (occupantOfSlot[slot] === undefined || tryAssign(occupantOfSlot[slot], seen)) {
        occupantOfSlot[slot] = ti;
        return true;
      }
    }
    return false;
  };

  for (let ti = 0; ti < thirdGroups.length; ti++) tryAssign(ti, new Set());
  return occupantOfSlot;
}
