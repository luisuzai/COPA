/**
 * Mata-mata REAL da Copa 2026 — ponte entre os jogos do `matches.json` e a
 * árvore oficial do `bracket.ts`.
 *
 * A fase de grupos acabou e as 16-avos já têm confrontos concretos no JSON, mas
 * sem o número do jogo (73–104) que liga cada confronto à estrutura `BRACKET`.
 * Este módulo:
 *  1. calcula a classificação FINAL de cada grupo (1º/2º/3º);
 *  2. casa cada jogo real das 16-avos com seu nó na árvore oficial — sem a
 *     aproximação dos 3º colocados, porque os pares reais já são conhecidos;
 *  3. resolve a árvore pra frente dado um conjunto de vencedores (resultados
 *     reais e/ou palpites do usuário), preenchendo as fases seguintes.
 *
 * Puro (sem fs) → serve tanto o build-time (páginas estáticas) quanto o cliente
 * (simulador). A matemática de cada jogo continua em `bracket.ts`.
 */

import { BRACKET, KO_MATCHES, ROUND_OF_32, type Source } from "@/lib/bracket";
import type { GroupId, Match, Stage, Team } from "@/lib/types";

// ──────────────────────────────────────────────────────────────
//  Classificação final dos grupos
// ──────────────────────────────────────────────────────────────

/**
 * Classificação final de cada grupo, dos jogos finalizados, com os mesmos
 * critérios de desempate do resto do site (pontos → saldo → gols pró).
 * Retorna, por grupo, os times ordenados (índice 0 = 1º colocado).
 */
export function finalGroupStandings(
  teams: Team[],
  matches: Match[],
): Map<GroupId, Team[]> {
  interface Agg {
    team: Team;
    pts: number;
    gd: number;
    gf: number;
  }
  const agg = new Map<string, Agg>(
    teams.map((t) => [t.id, { team: t, pts: 0, gd: 0, gf: 0 }]),
  );

  for (const m of matches) {
    if (m.stage !== "group") continue;
    if (m.status !== "finished" || m.homeScore == null || m.awayScore == null) continue;
    const h = agg.get(m.homeId);
    const a = agg.get(m.awayId);
    if (!h || !a) continue;
    h.gf += m.homeScore; a.gf += m.awayScore;
    h.gd += m.homeScore - m.awayScore;
    a.gd += m.awayScore - m.homeScore;
    if (m.homeScore > m.awayScore) h.pts += 3;
    else if (m.homeScore < m.awayScore) a.pts += 3;
    else { h.pts += 1; a.pts += 1; }
  }

  const byGroup = new Map<GroupId, Team[]>();
  const groups = [...new Set(teams.map((t) => t.group))].sort() as GroupId[];
  for (const g of groups) {
    const ranked = teams
      .filter((t) => t.group === g)
      .map((t) => agg.get(t.id)!)
      .sort((x, y) => y.pts - x.pts || y.gd - x.gd || y.gf - x.gf)
      .map((x) => x.team);
    byGroup.set(g, ranked);
  }
  return byGroup;
}

/** Posição de uma seleção no seu grupo: 1º (winner), 2º (runner), 3º (third) ou fora. */
type GroupRank = "winner" | "runner" | "third" | "out";

function groupRankOf(standings: Map<GroupId, Team[]>): Map<string, GroupRank> {
  const out = new Map<string, GroupRank>();
  for (const ranked of standings.values()) {
    ranked.forEach((t, i) => {
      out.set(t.id, i === 0 ? "winner" : i === 1 ? "runner" : i === 2 ? "third" : "out");
    });
  }
  return out;
}

// ──────────────────────────────────────────────────────────────
//  Casamento 16-avos reais ↔ árvore oficial
// ──────────────────────────────────────────────────────────────

/** Chave única de uma fonte concreta (1º/2º de um grupo). Ex: "w:e", "r:c". */
function concreteKey(src: Source): string | null {
  if (src.kind === "winner") return `w:${src.group}`;
  if (src.kind === "runner") return `r:${src.group}`;
  return null; // "third" não é único por grupo; "match" não ocorre nas 16-avos
}

/** Chave concreta de uma seleção a partir da sua posição no grupo. */
function teamConcreteKey(
  teamId: string,
  team: Team | undefined,
  rank: GroupRank | undefined,
): string | null {
  if (!team) return null;
  if (rank === "winner") return `w:${team.group}`;
  if (rank === "runner") return `r:${team.group}`;
  return null;
}

export interface KnockoutMapping {
  /** Número do jogo (73…104) → jogo real, quando ele já existe no JSON. */
  matchByGame: Map<number, Match>;
  /** Slug do jogo real → número do jogo na árvore. */
  gameByMatchSlug: Map<string, number>;
}

/**
 * Liga cada uma das 16 partidas reais das 16-avos ao seu número na árvore
 * oficial. Cada nó das 16-avos tem ao menos uma fonte concreta (1º/2º de grupo),
 * e cada chave concreta ("w:e", "r:c"…) aparece em EXATAMENTE um nó — então o
 * time concreto de cada jogo real identifica o nó sem ambiguidade. Exato: usa os
 * pares reais, sem a aproximação dos 3º colocados.
 */
export function mapRoundOf32(teams: Team[], matches: Match[]): KnockoutMapping {
  const teamById = new Map(teams.map((t) => [t.id, t]));
  const rank = groupRankOf(finalGroupStandings(teams, matches));

  // chave concreta → número do jogo (cada uma é única na árvore).
  const gameByKey = new Map<string, number>();
  for (const num of ROUND_OF_32) {
    const bm = BRACKET[num];
    for (const k of [concreteKey(bm.a), concreteKey(bm.b)]) {
      if (k) gameByKey.set(k, num);
    }
  }

  const matchByGame = new Map<number, Match>();
  const gameByMatchSlug = new Map<string, number>();

  for (const m of matches) {
    if (m.stage !== "round_of_32") continue;
    const keys = [
      teamConcreteKey(m.homeId, teamById.get(m.homeId), rank.get(m.homeId)),
      teamConcreteKey(m.awayId, teamById.get(m.awayId), rank.get(m.awayId)),
    ];
    let game: number | undefined;
    for (const k of keys) {
      if (k && gameByKey.has(k)) { game = gameByKey.get(k); break; }
    }
    if (game == null) continue; // defensivo: não deve ocorrer com dados consistentes
    matchByGame.set(game, m);
    gameByMatchSlug.set(m.slug, game);
  }

  return { matchByGame, gameByMatchSlug };
}

// ──────────────────────────────────────────────────────────────
//  Resolução da árvore pra frente
// ──────────────────────────────────────────────────────────────

/** Os dois ocupantes de um jogo da chave (undefined = ainda indefinido). */
export interface Slot {
  game: number;
  stage: Stage;
  a?: string;
  b?: string;
  /** Vencedor já conhecido (resultado real ou palpite), se houver. */
  winner?: string;
}

/** Para um jogo R16+, os números dos dois jogos-filhos que o alimentam. */
export function childGames(game: number): [number, number] | null {
  const bm = BRACKET[game];
  if (bm.a.kind === "match" && bm.b.kind === "match") return [bm.a.match, bm.b.match];
  return null;
}

/**
 * Resolve toda a árvore do mata-mata pra frente.
 *
 * - As 16-avos recebem os pares reais (homeId/awayId) do `matches.json`.
 * - As fases seguintes recebem os vencedores dos jogos-filhos.
 * - `winners` traz os vencedores conhecidos (resultados reais e/ou palpites do
 *   usuário) por número do jogo; o que não estiver lá fica indefinido.
 *
 * Resolver em ordem crescente garante que cada filho já está pronto.
 */
export function resolveBracket(
  mapping: KnockoutMapping,
  winners: Map<number, string>,
): Map<number, Slot> {
  const slots = new Map<number, Slot>();

  for (const num of KO_MATCHES) {
    const stage = BRACKET[num].stage;
    let a: string | undefined;
    let b: string | undefined;

    if (stage === "round_of_32") {
      const m = mapping.matchByGame.get(num);
      a = m?.homeId;
      b = m?.awayId;
    } else {
      const kids = childGames(num);
      if (kids) {
        a = slots.get(kids[0])?.winner;
        b = slots.get(kids[1])?.winner;
      }
    }

    slots.set(num, { game: num, stage, a, b, winner: winners.get(num) });
  }

  return slots;
}

/**
 * Vencedores REAIS já conhecidos das 16-avos (jogos finalizados com placar).
 * Base para o estado inicial das duas telas — o que o usuário não pode mudar.
 */
export function realWinners(mapping: KnockoutMapping): Map<number, string> {
  const winners = new Map<number, string>();
  for (const [game, m] of mapping.matchByGame) {
    if (m.status !== "finished" || m.homeScore == null || m.awayScore == null) continue;
    if (m.homeScore === m.awayScore) continue; // empate em mata-mata → decidido nos pênaltis; sem placar de pênalti no JSON, fica em aberto
    winners.set(game, m.homeScore > m.awayScore ? m.homeId : m.awayId);
  }
  return winners;
}
