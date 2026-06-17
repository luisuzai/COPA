/**
 * COPA — Contrato de dados compartilhado.
 *
 * Este arquivo é a FONTE ÚNICA da verdade sobre o formato dos JSON.
 * - O pipeline Python (copa/serializers.py) ESCREVE exatamente neste formato.
 * - A web LÊ os JSON usando estes tipos.
 *
 * Se o Python mudar um campo, o build TypeScript quebra aqui — de propósito.
 * É a rede de segurança entre as duas linguagens.
 *
 * Convenções:
 * - Probabilidades são floats em [0, 1] (não porcentagens).
 * - Datas são strings ISO 8601 em UTC (ex: "2026-06-15T18:00:00Z").
 * - `id` é estável e técnico; `slug` é amigável p/ URL (ex: "brazil").
 */

// ──────────────────────────────────────────────────────────────
//  Domínio base
// ──────────────────────────────────────────────────────────────

/** Códigos dos grupos da Copa 2026 (12 grupos: A..L). */
export type GroupId =
  | "a" | "b" | "c" | "d" | "e" | "f"
  | "g" | "h" | "i" | "j" | "k" | "l";

/** Confederações da FIFA. */
export type Confederation =
  | "UEFA"
  | "CONMEBOL"
  | "CONCACAF"
  | "CAF"
  | "AFC"
  | "OFC";

/** Fases do torneio (formato 2026: 48 times → mata-mata a partir das 32avas). */
export type Stage =
  | "group"
  | "round_of_32"
  | "round_of_16"
  | "quarter"
  | "semi"
  | "third_place"
  | "final";

/** Estado de um jogo. */
export type MatchStatus = "scheduled" | "live" | "finished";

// ──────────────────────────────────────────────────────────────
//  Entidades
// ──────────────────────────────────────────────────────────────

export interface Team {
  id: string;
  slug: string;
  /** Nome de exibição localizado (pt-BR). Ex: "Brasil". */
  name: string;
  /** Código FIFA de 3 letras. Ex: "BRA". */
  code: string;
  /** Emoji da bandeira (fallback). Ex: "🇧🇷". */
  flag: string;
  /** URL da imagem da bandeira/escudo (SVG). Renderização robusta cross-platform. */
  crest?: string;
  confederation: Confederation;
  group: GroupId;
  /** Rating Elo atual. */
  elo: number;
  /** Rating Elo pré-Copa (baseline). Usado p/ medir overperformance. */
  eloBase?: number;
}

export interface Match {
  id: string;
  /** Slug do confronto p/ URL. Ex: "brazil-vs-spain". */
  slug: string;
  stage: Stage;
  /** Presente apenas na fase de grupos. */
  group?: GroupId;
  homeId: string;
  awayId: string;
  /** Placar — presente apenas quando status = "finished" (ou "live"). */
  homeScore?: number;
  awayScore?: number;
  status: MatchStatus;
  /** Início do jogo em ISO 8601 (UTC). */
  kickoff: string;
  venue?: string;
}

// ──────────────────────────────────────────────────────────────
//  Saídas do modelo estatístico
// ──────────────────────────────────────────────────────────────

export interface RankingEntry {
  teamId: string;
  rank: number;
  elo: number;
  /** Variação de Elo desde o build anterior (pode ser negativa). */
  eloChange: number;
  /** Variação de posição no ranking desde o build anterior. */
  rankChange: number;
}

export interface Rankings {
  generatedAt: string;
  entries: RankingEntry[];
}

/** Probabilidades de uma seleção avançar em cada fase (todas em [0,1]). */
export interface TeamProbabilities {
  teamId: string;
  advanceGroup: number;
  roundOf16: number;
  quarter: number;
  semi: number;
  final: number;
  champion: number;
  /** Variação da chance de título desde o build anterior. */
  championChange: number;
}

export interface Probabilities {
  generatedAt: string;
  /** Nº de simulações Monte Carlo usadas. */
  simulations: number;
  teams: TeamProbabilities[];
}

/** Previsão probabilística de um confronto específico. */
export interface MatchPrediction {
  matchSlug: string;
  homeId: string;
  awayId: string;
  homeWin: number;
  draw: number;
  awayWin: number;
  expectedHomeGoals: number;
  expectedAwayGoals: number;
}

export interface Predictions {
  generatedAt: string;
  matches: MatchPrediction[];
}

// ──────────────────────────────────────────────────────────────
//  Cenários (adversários e caminhos prováveis)
// ──────────────────────────────────────────────────────────────

export interface LikelyOpponent {
  stage: Stage;
  teamId: string;
  /** Probabilidade de enfrentar este time nesta fase, em [0,1]. */
  probability: number;
}

export interface PathStep {
  stage: Stage;
  /** Adversário mais provável nesta etapa do caminho. */
  opponentId: string;
  winProbability: number;
}

export interface TeamScenario {
  teamId: string;
  likelyOpponents: LikelyOpponent[];
  /** Caminho mais provável até a final (uma etapa por fase). */
  likeliestPath: PathStep[];
  /** Dificuldade média do caminho (Elo médio dos adversários prováveis). */
  pathDifficulty: number;
}

export interface Scenarios {
  generatedAt: string;
  teams: TeamScenario[];
}

// ──────────────────────────────────────────────────────────────
//  Conteúdo gerado pela IA (OpenAI narra, nunca calcula)
// ──────────────────────────────────────────────────────────────

export type ArticleType =
  | "home"
  | "team"
  | "match"
  | "recap"
  | "scenario"
  | "group";

export interface Article {
  id: string;
  /** Liga o artigo à entidade. Ex: "brazil", "brazil-vs-spain", "a". */
  slug: string;
  type: ArticleType;
  /** Manchete estilo capa de revista. */
  title: string;
  /** Subtítulo curto (1 linha) p/ meta description e cards. */
  summary: string;
  /** Corpo em Markdown — renderizado no HTML p/ SEO. */
  body: string;
  generatedAt: string;
  /** Hash das estatísticas de entrada — usado p/ cache (não regerar se igual). */
  inputHash: string;
}

export interface Articles {
  generatedAt: string;
  items: Article[];
}

// ──────────────────────────────────────────────────────────────
//  Histórico de probabilidades (evolução diária)
// ──────────────────────────────────────────────────────────────

export interface ChampionSnapshot {
  /** Data do snapshot (YYYY-MM-DD, UTC). */
  date: string;
  /** teamId → chance de título naquele dia (0..1). */
  champions: Record<string, number>;
}

export interface History {
  snapshots: ChampionSnapshot[];
}

/** Ponto pronto p/ sparkline de uma seleção. */
export interface HistoryPoint {
  date: string;
  value: number;
}

// ──────────────────────────────────────────────────────────────
//  Tipos auxiliares de UI (derivados, não persistidos)
// ──────────────────────────────────────────────────────────────

/** Linha pronta p/ a tabela de favoritos da Home. */
export interface FavoriteRow {
  team: Team;
  rank: number;
  champion: number;
  championChange: number;
  final: number;
  semi: number;
}
