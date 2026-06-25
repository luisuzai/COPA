/**
 * Cenários por simulação Monte Carlo sobre o chaveamento OFICIAL da Copa 2026.
 *
 * Roda o torneio N vezes a partir da situação atual (jogos finalizados + palpites
 * do usuário, no simulador) e conta, para cada seleção, com que frequência ela
 * encontra cada adversário em cada fase do mata-mata. Em cada confronto o
 * vencedor é SORTEADO pela probabilidade de avanço (Elo/Poisson) — então zebras
 * acontecem na proporção certa, o que dá adversários prováveis muito mais
 * realistas do que escolher sempre o favorito.
 *
 * Mesmo motor usado em dois lugares:
 *  - build-time (lib/data.ts) → páginas de seleção e /scenarios (sem palpites);
 *  - cliente (simulador) → reage aos palpites do usuário.
 */

import {
  BRACKET,
  KO_MATCHES,
  KO_STAGES,
  type Source,
  advanceProbability,
  assignThirds,
  expectedGoals,
} from "@/lib/bracket";
import type { GroupId, Match, Stage, Team } from "@/lib/types";

export type Outcome = "home" | "draw" | "away";

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
  /** Palpites de jogos de grupo (slug → resultado). Usado no simulador. */
  picks?: Record<string, Outcome>;
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
//  RNG e amostragem
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

/** Amostra de uma Poisson de média lam (algoritmo de Knuth; lam pequeno). */
function samplePoisson(rng: () => number, lam: number): number {
  const L = Math.exp(-lam);
  let k = 0;
  let p = 1;
  do {
    k++;
    p *= rng();
  } while (p > L);
  return k - 1;
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
  const picks = opts.picks ?? {};
  const top = { ...DEFAULT_TOP, ...opts.topPerStage };
  const rng = mulberry32(opts.seed ?? 0x00c0_0a26);

  const T = teams.length;
  const idx = new Map(teams.map((t, i) => [t.id, i]));
  const elo = teams.map((t) => t.elo);

  // Grupos → índices dos membros, em ordem estável.
  const groupIds = [...new Set(teams.map((t) => t.group))].sort() as GroupId[];
  const groupMembers = new Map<GroupId, number[]>();
  for (const g of groupIds) {
    groupMembers.set(
      g,
      teams.map((t, i) => (t.group === g ? i : -1)).filter((i) => i >= 0),
    );
  }

  // Jogos de grupo por grupo: base fixa (finalizados + palpites) e a simular.
  interface GroupGame {
    h: number;
    a: number;
    lamH: number;
    lamA: number;
  }
  const basePts = new Float64Array(T);
  const baseGd = new Float64Array(T);
  const baseGf = new Float64Array(T);
  const toSim = new Map<GroupId, GroupGame[]>(groupIds.map((g) => [g, []]));

  for (const mt of matches) {
    if (mt.stage !== "group" || !mt.group) continue;
    const h = idx.get(mt.homeId);
    const a = idx.get(mt.awayId);
    if (h == null || a == null) continue;

    if (mt.status === "finished" && mt.homeScore != null && mt.awayScore != null) {
      basePts[h] += mt.homeScore > mt.awayScore ? 3 : mt.homeScore === mt.awayScore ? 1 : 0;
      basePts[a] += mt.awayScore > mt.homeScore ? 3 : mt.homeScore === mt.awayScore ? 1 : 0;
      baseGf[h] += mt.homeScore; baseGf[a] += mt.awayScore;
      baseGd[h] += mt.homeScore - mt.awayScore;
      baseGd[a] += mt.awayScore - mt.homeScore;
    } else if (picks[mt.slug]) {
      // Palpite só tem vencedor/empate (sem placar) → pontos, sem gols.
      const o = picks[mt.slug];
      basePts[h] += o === "home" ? 3 : o === "draw" ? 1 : 0;
      basePts[a] += o === "away" ? 3 : o === "draw" ? 1 : 0;
    } else {
      const [lamH, lamA] = expectedGoals(elo[h], elo[a]);
      toSim.get(mt.group)!.push({ h, a, lamH, lamA });
    }
  }

  // Matriz de avanço pré-computada (depende só do par de Elos).
  const adv: Float64Array[] = Array.from({ length: T }, () => new Float64Array(T));
  for (let i = 0; i < T; i++)
    for (let j = 0; j < T; j++) if (i !== j) adv[i][j] = advanceProbability(elo[i], elo[j]);

  // Acumuladores por fase: contagens (T) e confrontos (T×T).
  const reach: Record<Stage, Int32Array> = {} as Record<Stage, Int32Array>;
  const wins: Record<Stage, Int32Array> = {} as Record<Stage, Int32Array>;
  const oppCount: Record<Stage, Int32Array> = {} as Record<Stage, Int32Array>;
  for (const s of KO_STAGES) {
    reach[s] = new Int32Array(T);
    wins[s] = new Int32Array(T);
    oppCount[s] = new Int32Array(T * T);
  }
  const championCount = new Int32Array(T);

  // Buffers reutilizados a cada simulação.
  const pts = new Float64Array(T);
  const gd = new Float64Array(T);
  const gf = new Float64Array(T);
  const winnerOf = new Int32Array(110); // nº do jogo → índice do vencedor
  const thirdBySlot: Record<number, number> = {};

  for (let s = 0; s < nSims; s++) {
    pts.set(basePts); gd.set(baseGd); gf.set(baseGf);

    // ── Fase de grupos ──
    for (const g of groupIds) {
      for (const game of toSim.get(g)!) {
        const gh = samplePoisson(rng, game.lamH);
        const ga = samplePoisson(rng, game.lamA);
        pts[game.h] += gh > ga ? 3 : gh === ga ? 1 : 0;
        pts[game.a] += ga > gh ? 3 : gh === ga ? 1 : 0;
        gf[game.h] += gh; gf[game.a] += ga;
        gd[game.h] += gh - ga; gd[game.a] += ga - gh;
      }
    }

    // Classificação de cada grupo (pontos → saldo → gols pró → ruído estável).
    const winners: Partial<Record<GroupId, number>> = {};
    const runners: Partial<Record<GroupId, number>> = {};
    const thirds: { team: number; group: GroupId; score: number }[] = [];
    const scoreOf = (t: number) => pts[t] * 1e9 + (gd[t] + 500) * 1e4 + gf[t] * 10 + rng();
    for (const g of groupIds) {
      const ranked = [...groupMembers.get(g)!].sort((x, y) => scoreOf(y) - scoreOf(x));
      winners[g] = ranked[0];
      runners[g] = ranked[1];
      thirds.push({ team: ranked[2], group: g, score: scoreOf(ranked[2]) });
    }

    // 8 melhores 3º colocados → alocação às vagas pelas regras de grupo.
    thirds.sort((x, y) => y.score - x.score);
    const qualified = thirds.slice(0, 8);
    const slotIndex = assignThirds(qualified.map((q) => q.group));
    for (const slot in slotIndex) thirdBySlot[slot] = qualified[slotIndex[slot]].team;

    const resolveSrc = (src: Source): number => {
      switch (src.kind) {
        case "winner": return winners[src.group] ?? -1;
        case "runner": return runners[src.group] ?? -1;
        case "third": return thirdBySlot[src.slot] ?? -1;
        case "match": return winnerOf[src.match];
      }
    };

    // ── Mata-mata ──
    for (const num of KO_MATCHES) {
      const bm = BRACKET[num];
      const a = resolveSrc(bm.a);
      const b = resolveSrc(bm.b);
      const stage = bm.stage;

      if (a < 0 || b < 0) {
        winnerOf[num] = a < 0 ? b : a; // bye defensivo (não deve ocorrer)
        continue;
      }
      // Os dois jogam esta fase e são adversários um do outro.
      reach[stage][a]++; reach[stage][b]++;
      oppCount[stage][a * T + b]++; oppCount[stage][b * T + a]++;

      const aWins = rng() < adv[a][b];
      const winner = aWins ? a : b;
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

      // Adversários ordenados por frequência.
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
