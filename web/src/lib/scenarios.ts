/**
 * Cenários por simulação Monte Carlo sobre o chaveamento REAL da Copa 2026.
 *
 * A fase de grupos acabou: as 16-avos já têm confrontos concretos. A simulação
 * parte desses pares reais (via lib/knockout) em vez de re-derivar a chave dos
 * grupos, FORÇA os resultados já decididos e, opcionalmente, os palpites do
 * usuário (no simulador). Cada confronto em aberto é SORTEADO pela probabilidade
 * de avanço (Elo/Poisson) — zebras na proporção certa.
 *
 * Conta, para cada seleção, com que frequência alcança cada fase, vence cada
 * fase e encontra cada adversário. Mesmo motor em dois lugares:
 *  - build-time (lib/data.ts) → páginas de seleção e /scenarios (estado real);
 *  - cliente (simulador) → reage aos palpites do usuário.
 */

import {
  BRACKET,
  KO_MATCHES,
  KO_STAGES,
  ROUND_OF_32,
  advanceProbability,
} from "@/lib/bracket";
import { childGames, mapRoundOf32, realWinners } from "@/lib/knockout";
import type { Match, Stage, Team } from "@/lib/types";

/** Panorama de uma seleção numa fase do mata-mata. */
export interface StageOutlook {
  stage: Stage;
  /** P(a seleção chega a esta fase), em [0,1]. */
  reach: number;
  /** P(vencer este confronto | chegou a esta fase), em [0,1]. */
  advance: number;
  /** Adversários mais prováveis nesta fase (prob. condicionada a ter chegado). */
  opponents: { teamId: string; probability: number }[];
}

export interface TeamScenario {
  teamId: string;
  /** Uma entrada por fase alcançável (round_of_32 … final). */
  stages: StageOutlook[];
  /** P(ser campeã). */
  champion: number;
  /** Dificuldade do caminho: Elo esperado dos adversários, média das fases. */
  pathDifficulty: number;
}

export interface SimOptions {
  nSims?: number;
  seed?: number;
  /**
   * Vencedores FORÇADOS por número do jogo (73…104) — os palpites do usuário no
   * simulador. Os resultados reais já decididos entram automaticamente; estes se
   * somam a eles. Cada jogo só deve ser fixado quando seus dois participantes já
   * estão definidos, então o vencedor forçado é sempre um deles.
   */
  forcedWinners?: Map<number, string>;
  /** Quantos adversários listar por fase. */
  topPerStage?: Partial<Record<Stage, number>>;
}

const DEFAULT_TOP: Record<Stage, number> = {
  group: 0,
  round_of_32: 2,
  round_of_16: 3,
  quarter: 3,
  semi: 4,
  third_place: 0,
  final: 4,
};

// ──────────────────────────────────────────────────────────────
//  RNG
// ──────────────────────────────────────────────────────────────

/** PRNG determinístico (mulberry32) — mesma semente, mesmo resultado. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ──────────────────────────────────────────────────────────────
//  Simulação
// ──────────────────────────────────────────────────────────────

export function simulateScenarios(
  teams: Team[],
  matches: Match[],
  opts: SimOptions = {},
): Map<string, TeamScenario> {
  const nSims = opts.nSims ?? 10000;
  const top = { ...DEFAULT_TOP, ...opts.topPerStage };
  const rng = mulberry32(opts.seed ?? 0x00c0_0a26);

  const T = teams.length;
  const idx = new Map(teams.map((t, i) => [t.id, i]));
  const elo = teams.map((t) => t.elo);

  // Chave real: pares das 16-avos + vencedores já conhecidos.
  const mapping = mapRoundOf32(teams, matches);
  const real = realWinners(mapping);

  // Vencedores forçados (reais têm precedência sobre palpites, mas em jogos já
  // decididos o usuário não palpita → não há conflito de fato).
  const forcedIdx = new Int32Array(110).fill(-1);
  for (const [game, teamId] of opts.forcedWinners ?? new Map()) {
    const i = idx.get(teamId);
    if (i != null) forcedIdx[game] = i;
  }
  for (const [game, teamId] of real) {
    const i = idx.get(teamId);
    if (i != null) forcedIdx[game] = i;
  }

  // Pares das 16-avos (índices de time por jogo). Sem par real → fora da chave.
  const leafA = new Int32Array(110).fill(-1);
  const leafB = new Int32Array(110).fill(-1);
  for (const num of ROUND_OF_32) {
    const m = mapping.matchByGame.get(num);
    if (!m) continue;
    leafA[num] = idx.get(m.homeId) ?? -1;
    leafB[num] = idx.get(m.awayId) ?? -1;
  }

  // Filhos de cada jogo R16+ (pré-resolvidos).
  const kids = new Map<number, [number, number]>();
  for (const num of KO_MATCHES) {
    if (BRACKET[num].stage === "round_of_32") continue;
    const c = childGames(num);
    if (c) kids.set(num, c);
  }

  // Matriz de avanço pré-computada (depende só do par de Elos).
  const adv: Float64Array[] = Array.from({ length: T }, () => new Float64Array(T));
  for (let i = 0; i < T; i++)
    for (let j = 0; j < T; j++) if (i !== j) adv[i][j] = advanceProbability(elo[i], elo[j]);

  // Acumuladores por fase.
  const reach: Record<Stage, Int32Array> = {} as Record<Stage, Int32Array>;
  const wins: Record<Stage, Int32Array> = {} as Record<Stage, Int32Array>;
  const oppCount: Record<Stage, Int32Array> = {} as Record<Stage, Int32Array>;
  for (const s of KO_STAGES) {
    reach[s] = new Int32Array(T);
    wins[s] = new Int32Array(T);
    oppCount[s] = new Int32Array(T * T);
  }
  const championCount = new Int32Array(T);
  const winnerOf = new Int32Array(110); // nº do jogo → índice do vencedor

  for (let s = 0; s < nSims; s++) {
    for (const num of KO_MATCHES) {
      const bm = BRACKET[num];
      const stage = bm.stage;
      let a: number;
      let b: number;
      if (stage === "round_of_32") {
        a = leafA[num];
        b = leafB[num];
      } else {
        const c = kids.get(num)!;
        a = winnerOf[c[0]];
        b = winnerOf[c[1]];
      }

      if (a < 0 || b < 0) {
        winnerOf[num] = a < 0 ? b : a; // defensivo (não deve ocorrer)
        continue;
      }

      // Os dois disputam esta fase e são adversários um do outro.
      reach[stage][a]++; reach[stage][b]++;
      oppCount[stage][a * T + b]++; oppCount[stage][b * T + a]++;

      // Vencedor forçado (real/palpite), desde que seja um dos participantes;
      // senão sorteia pela probabilidade de avanço.
      const f = forcedIdx[num];
      const winner = f === a || f === b ? f : rng() < adv[a][b] ? a : b;
      wins[stage][winner]++;
      winnerOf[num] = winner;
    }
    championCount[winnerOf[104]]++;
  }

  // ── Consolidação ──
  const out = new Map<string, TeamScenario>();
  for (let t = 0; t < T; t++) {
    const stages: StageOutlook[] = [];
    let diffSum = 0;
    let diffStages = 0;

    for (const stage of KO_STAGES) {
      const reached = reach[stage][t];
      if (reached === 0) continue;

      const counts: { teamId: string; probability: number }[] = [];
      let expectedOppElo = 0;
      const baseRow = t * T;
      for (let o = 0; o < T; o++) {
        const c = oppCount[stage][baseRow + o];
        if (c === 0) continue;
        const p = c / reached;
        counts.push({ teamId: teams[o].id, probability: p });
        expectedOppElo += p * elo[o];
      }
      counts.sort((x, y) => y.probability - x.probability);

      stages.push({
        stage,
        reach: reached / nSims,
        advance: wins[stage][t] / reached,
        opponents: counts.slice(0, top[stage] || 2),
      });
      diffSum += expectedOppElo;
      diffStages++;
    }

    out.set(teams[t].id, {
      teamId: teams[t].id,
      stages,
      champion: championCount[t] / nSims,
      pathDifficulty: diffStages ? Math.round(diffSum / diffStages) : 0,
    });
  }
  return out;
}
