/**
 * Loaders de dados em BUILD-TIME (Server Components / SSG).
 *
 * Lê os JSON da fonte única da verdade (/data na raiz do monorepo). Como roda
 * só no build, pode usar fs livremente — nada disso vai para o cliente.
 *
 * O simulador (client-side) NÃO usa este módulo; ele faz fetch dos JSON
 * estáticos em /public/data. Ver lib/elo.ts (Fase 6).
 */
import fs from "node:fs";
import path from "node:path";

import type {
  Article,
  Articles,
  FavoriteRow,
  GroupId,
  History,
  HistoryPoint,
  Match,
  MatchPrediction,
  Predictions,
  Probabilities,
  Rankings,
  Scenarios,
  Team,
  TeamProbabilities,
  TeamScenario,
} from "./types";
import {
  simulateScenarios,
  type TeamScenario as OfficialScenario,
} from "./scenarios";

// Procura primeiro em /data (raiz, completo) e depois em /public/data (subset).
const DATA_DIRS = [
  path.join(process.cwd(), "..", "data"),
  path.join(process.cwd(), "public", "data"),
];

const cache = new Map<string, unknown>();

function readJSON<T>(name: string): T {
  if (cache.has(name)) return cache.get(name) as T;
  for (const dir of DATA_DIRS) {
    const file = path.join(dir, name);
    if (fs.existsSync(file)) {
      const data = JSON.parse(fs.readFileSync(file, "utf-8")) as T;
      cache.set(name, data);
      return data;
    }
  }
  throw new Error(`Arquivo de dados não encontrado: ${name} (rode o pipeline).`);
}

// ── Coleções cruas ────────────────────────────────────────────
export const getTeams = () => readJSON<Team[]>("teams.json");
export const getMatches = () => readJSON<Match[]>("matches.json");
export const getRankings = () => readJSON<Rankings>("rankings.json");
export const getProbabilities = () => readJSON<Probabilities>("probabilities.json");
export const getPredictions = () => readJSON<Predictions>("predictions.json");
export const getScenarios = () => readJSON<Scenarios>("scenarios.json");
export const getArticles = () => readJSON<Articles>("articles.json");

// ── Índices auxiliares ────────────────────────────────────────
export function getTeamById(): Map<string, Team> {
  return new Map(getTeams().map((t) => [t.id, t]));
}

export function getTeamBySlug(slug: string): Team | undefined {
  return getTeams().find((t) => t.slug === slug);
}

export function getProbabilitiesFor(teamId: string): TeamProbabilities | undefined {
  return getProbabilities().teams.find((t) => t.teamId === teamId);
}

export function getArticle(type: Article["type"], slug: string): Article | undefined {
  return getArticles().items.find((a) => a.type === type && a.slug === slug);
}

export function getRankFor(teamId: string): number | undefined {
  return getRankings().entries.find((e) => e.teamId === teamId)?.rank;
}

// ── Derivados p/ a UI ─────────────────────────────────────────
/** Linhas da tabela de favoritos, já ordenadas por chance de título. */
export function getFavorites(): FavoriteRow[] {
  const teamById = getTeamById();

  // probabilities já vem ordenado por chance de título (desc).
  const rows = getProbabilities()
    .teams.map((p) => {
      const team = teamById.get(p.teamId);
      return team
        ? {
            team,
            champion: p.champion,
            championChange: p.championChange,
            final: p.final,
            semi: p.semi,
          }
        : null;
    })
    .filter((r): r is Omit<FavoriteRow, "rank"> => r !== null);

  // rank = POSIÇÃO no favoritismo (1, 2, 3…), não o ranking de Elo.
  return rows.map((r, i) => ({ rank: i + 1, ...r }));
}

/** Seleções que mais mudaram de chance de título (|delta| desc). */
export function getMovers(limit = 3): FavoriteRow[] {
  return [...getFavorites()]
    .filter((r) => Math.abs(r.championChange) > 0)
    .sort((a, b) => Math.abs(b.championChange) - Math.abs(a.championChange))
    .slice(0, limit);
}

// ── Confrontos ────────────────────────────────────────────────
export function getMatchBySlug(slug: string): Match | undefined {
  return getMatches().find((m) => m.slug === slug);
}

export function getPredictionForMatch(slug: string): MatchPrediction | undefined {
  return getPredictions().matches.find((m) => m.matchSlug === slug);
}

/** Artigo do confronto: pós-jogo (recap) se finalizado, senão a prévia. */
export function getMatchArticle(slug: string): Article | undefined {
  const items = getArticles().items;
  return (
    items.find((a) => a.slug === slug && a.type === "recap") ??
    items.find((a) => a.slug === slug && a.type === "match")
  );
}

export interface RecentResult {
  match: Match;
  home: Team;
  away: Team;
  recap?: Article;
}

/** Últimos resultados (jogos finalizados, mais recentes primeiro) + pós-jogo. */
export function getRecentResults(limit = 6): RecentResult[] {
  const teamById = getTeamById();
  const finished = getMatches()
    .filter((m) => m.status === "finished" && m.homeScore != null && m.awayScore != null)
    .sort((a, b) => b.kickoff.localeCompare(a.kickoff));

  const out: RecentResult[] = [];
  for (const m of finished) {
    const home = teamById.get(m.homeId);
    const away = teamById.get(m.awayId);
    if (!home || !away) continue;
    out.push({ match: m, home, away, recap: getMatchArticle(m.slug) });
    if (out.length >= limit) break;
  }
  return out;
}

/** Próximo jogo agendado de uma seleção (mais cedo por kickoff). */
export function getNextMatchForTeam(teamId: string): Match | undefined {
  return getMatches()
    .filter((m) => m.status !== "finished" && (m.homeId === teamId || m.awayId === teamId))
    .sort((a, b) => a.kickoff.localeCompare(b.kickoff))[0];
}

export interface UpcomingMatch {
  match: Match;
  home: Team;
  away: Team;
  prediction?: MatchPrediction;
}

/** Próximos jogos (não finalizados), com a previsão — para o dashboard da Home. */
export function getUpcomingMatches(limit = 6): UpcomingMatch[] {
  const teamById = getTeamById();
  const predBySlug = new Map<string, MatchPrediction>(
    getPredictions().matches.map((p) => [p.matchSlug, p] as [string, MatchPrediction]),
  );
  const scheduled = getMatches()
    .filter((m) => m.status !== "finished")
    .sort((a, b) => a.kickoff.localeCompare(b.kickoff));

  const out: UpcomingMatch[] = [];
  for (const m of scheduled) {
    const home = teamById.get(m.homeId);
    const away = teamById.get(m.awayId);
    if (!home || !away) continue;
    out.push({ match: m, home, away, prediction: predBySlug.get(m.slug) });
    if (out.length >= limit) break;
  }
  return out;
}

// ── Grupos ────────────────────────────────────────────────────
export function getGroups(): GroupId[] {
  return [...new Set(getTeams().map((t) => t.group))].sort();
}

export function getGroupTeams(groupId: GroupId): Team[] {
  return getTeams().filter((t) => t.group === groupId);
}

export function getGroupMatches(groupId: GroupId): Match[] {
  return getMatches()
    .filter((m) => m.stage === "group" && m.group === groupId)
    .sort((a, b) => a.kickoff.localeCompare(b.kickoff));
}

export interface StandingRow {
  team: Team;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  gf: number;
  ga: number;
  gd: number;
  points: number;
  advanceGroup: number;
}

/** Classificação de um grupo a partir dos jogos finalizados. */
export function getStandings(groupId: GroupId): StandingRow[] {
  const teams = getGroupTeams(groupId);
  const probById = new Map(getProbabilities().teams.map((p) => [p.teamId, p]));
  const rows = new Map<string, StandingRow>(
    teams.map((team) => [
      team.id,
      {
        team,
        played: 0,
        won: 0,
        drawn: 0,
        lost: 0,
        gf: 0,
        ga: 0,
        gd: 0,
        points: 0,
        advanceGroup: probById.get(team.id)?.advanceGroup ?? 0,
      },
    ]),
  );

  for (const m of getGroupMatches(groupId)) {
    if (m.status !== "finished" || m.homeScore == null || m.awayScore == null) continue;
    const home = rows.get(m.homeId);
    const away = rows.get(m.awayId);
    if (!home || !away) continue;
    home.played++; away.played++;
    home.gf += m.homeScore; home.ga += m.awayScore;
    away.gf += m.awayScore; away.ga += m.homeScore;
    if (m.homeScore > m.awayScore) {
      home.won++; home.points += 3; away.lost++;
    } else if (m.homeScore < m.awayScore) {
      away.won++; away.points += 3; home.lost++;
    } else {
      home.drawn++; away.drawn++; home.points++; away.points++;
    }
  }

  for (const r of rows.values()) r.gd = r.gf - r.ga;
  return [...rows.values()].sort(
    (a, b) => b.points - a.points || b.gd - a.gd || b.gf - a.gf,
  );
}

// ── Cenários ──────────────────────────────────────────────────
export function getScenarioFor(teamId: string): TeamScenario | undefined {
  return getScenarios().teams.find((s) => s.teamId === teamId);
}

/**
 * Cenários OFICIAIS (chaveamento real da FIFA), por simulação Monte Carlo a
 * partir da situação atual dos grupos. Roda UMA vez por build e fica em cache
 * para servir todas as páginas de seleção e /scenarios. Mais sims que o cliente
 * (o simulador) porque aqui não há custo de interatividade.
 */
let _officialScenarios: Map<string, OfficialScenario> | null = null;
export function getOfficialScenarios(): Map<string, OfficialScenario> {
  if (!_officialScenarios) {
    _officialScenarios = simulateScenarios(getTeams(), getMatches(), {
      nSims: 20000,
      seed: 0x00c0_0a26,
    });
  }
  return _officialScenarios;
}

export function getOfficialScenarioFor(teamId: string): OfficialScenario | undefined {
  return getOfficialScenarios().get(teamId);
}

/** Toda seleção tem página de cenário (o caminho até a final é gerado p/ todas). */
export function getScenarioSlugs(): string[] {
  return getTeams().map((t) => t.slug);
}

// ── Líder & histórico ─────────────────────────────────────────
function readJSONOptional<T>(name: string): T | null {
  for (const dir of DATA_DIRS) {
    const file = path.join(dir, name);
    if (fs.existsSync(file)) return JSON.parse(fs.readFileSync(file, "utf-8")) as T;
  }
  return null;
}

/** A seleção líder em chance de título (a "história principal"). */
export function getLeader(): FavoriteRow {
  return getFavorites()[0];
}

/** Série histórica da chance de título de uma seleção (p/ sparkline). */
export function getHistory(teamId: string): HistoryPoint[] {
  const hist = readJSONOptional<History>("history.json");
  if (!hist) return [];
  return hist.snapshots
    .filter((s) => s.champions[teamId] != null)
    .map((s) => ({ date: s.date, value: s.champions[teamId] }));
}

// ── Último resultado de uma seleção (para insights causais) ───
export interface LastResult {
  match: Match;
  opponent: Team;
  gf: number;
  ga: number;
  outcome: "win" | "draw" | "loss";
}

export function getLastResultForTeam(teamId: string): LastResult | undefined {
  const teamById = getTeamById();
  const m = getMatches()
    .filter(
      (x) =>
        x.status === "finished" &&
        x.homeScore != null &&
        x.awayScore != null &&
        (x.homeId === teamId || x.awayId === teamId),
    )
    .sort((a, b) => b.kickoff.localeCompare(a.kickoff))[0];
  if (!m) return undefined;
  const isHome = m.homeId === teamId;
  const opponent = teamById.get(isHome ? m.awayId : m.homeId);
  if (!opponent) return undefined;
  const gf = (isHome ? m.homeScore : m.awayScore) as number;
  const ga = (isHome ? m.awayScore : m.homeScore) as number;
  const outcome = gf > ga ? "win" : gf < ga ? "loss" : "draw";
  return { match: m, opponent, gf, ga, outcome };
}

/** Frase curta do último resultado, ex: "venceu Gana (2 a 0)". */
export function resultReason(r: LastResult): string {
  const verb =
    r.outcome === "win" ? "venceu" : r.outcome === "loss" ? "perdeu para" : "empatou com";
  return `${verb} ${r.opponent.name} (${r.gf} a ${r.ga})`;
}

// ── Insights da Rodada ────────────────────────────────────────
export interface RoundInsight {
  label: string;
  team: Team;
  valueText: string;
  sublabel: string;
  kind: "up" | "down" | "neutral";
  /** Causa: o último resultado da seleção (ex: "empatou com Cabo Verde (0 a 0)"). */
  reason?: string;
}

/** Insights automáticos da rodada, derivados dos dados existentes. */
export function getRoundInsights(): RoundInsight[] {
  const favs = getFavorites(); // ordenado por título (desc); rank = posição
  const teams = getTeams();
  const eloRank = new Map(getRankings().entries.map((e) => [e.teamId, e.rank]));
  const champPos = new Map(favs.map((f) => [f.team.id, f.rank]));
  const insights: RoundInsight[] = [];

  // 1. Maior alta na chance de título
  const up = [...favs].sort((a, b) => b.championChange - a.championChange)[0];
  if (up && up.championChange > 0) {
    insights.push({
      label: "Maior alta",
      team: up.team,
      valueText: `+${(up.championChange * 100).toFixed(1)} pp`,
      sublabel: "chance de título",
      kind: "up",
    });
  }

  // 2. Maior queda
  const down = [...favs].sort((a, b) => a.championChange - b.championChange)[0];
  if (down && down.championChange < 0) {
    insights.push({
      label: "Maior queda",
      team: down.team,
      valueText: `${(down.championChange * 100).toFixed(1)} pp`,
      sublabel: "chance de título",
      kind: "down",
    });
  }

  // 3. Surpresa: maior ganho de Elo vs. baseline pré-Copa (rendendo acima)
  const surprise = [...teams]
    .filter((t) => t.eloBase != null)
    .sort(
      (a, b) =>
        b.elo - (b.eloBase ?? b.elo) - (a.elo - (a.eloBase ?? a.elo)),
    )[0];
  if (surprise && surprise.elo - (surprise.eloBase ?? surprise.elo) > 0.5) {
    const gain = Math.round(surprise.elo - (surprise.eloBase ?? surprise.elo));
    insights.push({
      label: "Surpresa da Copa",
      team: surprise,
      valueText: `+${gain} Elo`,
      sublabel: "acima do esperado",
      kind: "up",
    });
  }

  // 4. Subestimada: seleção FORTE (Elo top 16) cujo título está bem abaixo
  //    da sua posição no Elo (caminho difícil / grupo pesado).
  let best: { team: Team; gap: number } | null = null;
  for (const t of teams) {
    const er = eloRank.get(t.id);
    const cr = champPos.get(t.id);
    if (er == null || cr == null || er > 16) continue;
    const gap = cr - er; // título pior que Elo → subestimada
    if (!best || gap > best.gap) best = { team: t, gap };
  }
  if (best && best.gap >= 3) {
    insights.push({
      label: "Subestimada",
      team: best.team,
      valueText: `#${eloRank.get(best.team.id)} no Elo`,
      sublabel: `${champPos.get(best.team.id)}ª no título`,
      kind: "neutral",
    });
  }

  // Causa de cada insight: o último resultado da seleção (em números).
  for (const ins of insights) {
    const lr = getLastResultForTeam(ins.team.id);
    if (lr) ins.reason = resultReason(lr);
  }

  return insights.slice(0, 4);
}
