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
  const rankById = new Map(getRankings().entries.map((e) => [e.teamId, e.rank]));

  return getProbabilities()
    .teams.map((p) => {
      const team = teamById.get(p.teamId);
      if (!team) return null;
      return {
        team,
        rank: rankById.get(p.teamId) ?? 0,
        champion: p.champion,
        championChange: p.championChange,
        final: p.final,
        semi: p.semi,
      } satisfies FavoriteRow;
    })
    .filter((row): row is FavoriteRow => row !== null);
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

/** Próximo jogo agendado de uma seleção (mais cedo por kickoff). */
export function getNextMatchForTeam(teamId: string): Match | undefined {
  return getMatches()
    .filter((m) => m.status !== "finished" && (m.homeId === teamId || m.awayId === teamId))
    .sort((a, b) => a.kickoff.localeCompare(b.kickoff))[0];
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

/** Seleções que possuem página de cenário (têm dados de cenário). */
export function getScenarioSlugs(): string[] {
  const teamById = getTeamById();
  return getScenarios()
    .teams.map((s) => teamById.get(s.teamId)?.slug)
    .filter((slug): slug is string => Boolean(slug));
}
