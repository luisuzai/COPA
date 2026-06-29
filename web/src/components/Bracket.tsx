"use client";

import Link from "next/link";
import { type ReactElement, useRef } from "react";

import { Flag } from "@/components/Flag";
import { KO_STAGES, advanceProbability } from "@/lib/bracket";
import { childGames } from "@/lib/knockout";
import type { MatchStatus, Stage, Team } from "@/lib/types";
import { cn, formatDate, pct, stageLabel } from "@/lib/utils";

/**
 * Quadro do mata-mata (16-avos → final) — visão serializável de cada jogo.
 * As páginas montam isto a partir de `resolveBracket` (lib/knockout) + os jogos
 * reais. O componente é puro/apresentacional: serve tanto a tela read-only
 * (sem `onPick`) quanto o simulador interativo (com `onPick`).
 */
export interface BracketGameView {
  game: number;
  stage: Stage;
  /** Ocupantes do confronto (undefined = ainda a definir). */
  aId?: string;
  bId?: string;
  /** Vencedor já conhecido — resultado real ou palpite do usuário. */
  winnerId?: string;
  /** Placar, quando o jogo real já terminou (ou está ao vivo). */
  homeScore?: number;
  awayScore?: number;
  status?: MatchStatus;
  /** Início do jogo (ISO) — exibido nos agendados. */
  kickoff?: string;
  /** Slug do jogo real (link para a página do confronto), se existir. */
  slug?: string;
  /** No simulador: o usuário pode escolher o vencedor agora? */
  pickable?: boolean;
}

// Geometria fixa → linhas de conexão alinham com precisão (px, não %).
const CARD_W = 184; // largura do card de um confronto
const CONN_W = 28; // largura da coluna de conectores entre as fases
const STAGES_LTR: Stage[] = KO_STAGES; // 16-avos … final, da esquerda p/ a direita

// ──────────────────────────────────────────────────────────────
//  Componente
// ──────────────────────────────────────────────────────────────

export function Bracket({
  games,
  teams,
  onPick,
}: {
  games: BracketGameView[];
  teams: Team[];
  onPick?: (game: number, teamId: string) => void;
}) {
  const teamById = new Map(teams.map((t) => [t.id, t]));
  const byGame = new Map(games.map((g) => [g.game, g]));
  const scrollRef = useRef<HTMLDivElement>(null);

  const championId = byGame.get(104)?.winnerId;
  const champion = championId ? teamById.get(championId) : undefined;

  const scrollToStage = (i: number) =>
    scrollRef.current?.scrollTo({ left: i * (CARD_W + CONN_W), behavior: "smooth" });

  /**
   * Árvore recursiva: cada jogo fica à DIREITA dos dois que o alimentam, ligado
   * por um conector em cotovelo. Como a árvore é cheia e balanceada (todo jogo
   * das 16-avos está na mesma profundidade), os centros dos dois filhos caem
   * exatamente em 25% e 75% da altura — então as linhas alinham sempre.
   */
  function Node({ game }: { game: number }): ReactElement {
    const kids = childGames(game);
    const g = byGame.get(game);

    if (!kids) {
      return (
        <div className="flex items-center py-2.5" style={{ width: CARD_W }}>
          {g && <GameCard g={g} teamById={teamById} onPick={onPick} />}
        </div>
      );
    }

    const childWon = (c: number) => byGame.get(c)?.winnerId != null;

    return (
      <div className="flex items-center">
        <div className="flex flex-col">
          <Node game={kids[0]} />
          <Node game={kids[1]} />
        </div>
        {/* Conector em cotovelo (full-height da coluna de filhos). */}
        <div className="relative self-stretch shrink-0" style={{ width: CONN_W }} aria-hidden>
          <span
            className={cn("absolute left-0 top-1/4 h-px w-1/2", childWon(kids[0]) ? "bg-accent" : "bg-border")}
          />
          <span
            className={cn("absolute left-0 top-3/4 h-px w-1/2", childWon(kids[1]) ? "bg-accent" : "bg-border")}
          />
          <span className="absolute left-1/2 top-1/4 h-1/2 w-px bg-border" />
          <span className="absolute left-1/2 top-1/2 h-px w-1/2 bg-border" />
        </div>
        <div className="flex items-center" style={{ width: CARD_W }}>
          {g && <GameCard g={g} teamById={teamById} onPick={onPick} />}
        </div>
        {/* Coroação do campeão, à direita da final. */}
        {game === 104 && champion && (
          <>
            <div className="relative self-stretch shrink-0" style={{ width: CONN_W }} aria-hidden>
              <span className="absolute left-0 top-1/2 h-px w-full bg-accent" />
            </div>
            <ChampionBox team={champion} />
          </>
        )}
      </div>
    );
  }

  return (
    <div>
      {/* Atalhos por fase (mobile) — rolam o quadro até a coluna. */}
      <div className="mb-3 flex gap-1.5 overflow-x-auto pb-1 md:hidden">
        {STAGES_LTR.map((stage, i) => (
          <button
            key={stage}
            type="button"
            onClick={() => scrollToStage(i)}
            className="shrink-0 rounded-full border border-border px-3 py-1 text-[11px] font-medium text-muted transition-colors hover:border-accent/40 hover:text-foreground"
          >
            {stageLabel(stage).replace(" de final", "")}
          </button>
        ))}
      </div>

      <div ref={scrollRef} className="-mx-4 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0">
        <div style={{ minWidth: STAGES_LTR.length * CARD_W + (STAGES_LTR.length - 1) * CONN_W }}>
          {/* Cabeçalhos das fases, alinhados às colunas pela mesma geometria. */}
          <div className="mb-3 flex">
            {STAGES_LTR.map((stage, i) => (
              <div key={stage} className="flex items-center">
                <div
                  className="text-center text-[11px] font-medium uppercase tracking-wider text-muted"
                  style={{ width: CARD_W }}
                >
                  {stageLabel(stage)}
                </div>
                {i < STAGES_LTR.length - 1 && <div style={{ width: CONN_W }} />}
              </div>
            ))}
          </div>

          {/* Árvore (raiz = final, à direita). */}
          <Node game={104} />
        </div>
      </div>
    </div>
  );
}

function ChampionBox({ team }: { team: Team }) {
  return (
    <div
      className="flex shrink-0 flex-col items-center gap-2 rounded-xl border border-accent/50 bg-accent/5 px-4 py-4"
      style={{ width: CARD_W }}
    >
      <Crown className="size-5 text-accent" />
      <span className="text-[10px] uppercase tracking-wider text-accent">Campeão</span>
      <Flag team={team} size="lg" />
      <span className="text-center font-display text-sm font-bold leading-tight">
        {team.name}
      </span>
    </div>
  );
}

function Crown({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M3 7l3.5 3L12 4l5.5 6L21 7l-1.5 11h-15L3 7zm2.8 9h12.4l.6-4.3-2.4 2.1L12 7.8l-3.4 5.9-2.4-2.1.6 4.4z" />
    </svg>
  );
}

function GameCard({
  g,
  teamById,
  onPick,
}: {
  g: BracketGameView;
  teamById: Map<string, Team>;
  onPick?: (game: number, teamId: string) => void;
}) {
  const a = g.aId ? teamById.get(g.aId) : undefined;
  const b = g.bId ? teamById.get(g.bId) : undefined;
  const finished = g.status === "finished" && g.homeScore != null && g.awayScore != null;
  const live = g.status === "live";

  // Odds do confronto (só quando os dois lados existem e o jogo está agendado).
  let pa: number | undefined;
  if (a && b && !finished && !live) pa = advanceProbability(a.elo, b.elo);

  const canPick = Boolean(onPick && g.pickable && a && b);
  // Read-only (sem onPick): o card vira link para a página do confronto.
  const linkHref = !onPick && g.slug ? `/match/${g.slug}/` : undefined;

  const body = (
    <>
      <TeamRow team={a} side="home" g={g} prob={pa} finished={finished} live={live} canPick={canPick} onPick={onPick} />
      <div className="h-px bg-border/60" />
      <TeamRow team={b} side="away" g={g} prob={pa != null ? 1 - pa : undefined} finished={finished} live={live} canPick={canPick} onPick={onPick} />
      {g.slug && (
        <>
          <div className="h-px bg-border/60" />
          <div className="px-2.5 py-1 text-[10px] tabular-nums text-muted">
            {live ? (
              <span className="flex items-center gap-1.5 font-medium text-accent">
                <span className="size-1.5 animate-pulse rounded-full bg-accent" /> AO VIVO
              </span>
            ) : finished ? (
              "Encerrado"
            ) : g.kickoff ? (
              formatDate(g.kickoff)
            ) : (
              " "
            )}
          </div>
        </>
      )}
    </>
  );

  const cardCls = cn(
    "w-full overflow-hidden rounded-lg border bg-surface text-sm transition-colors",
    live ? "border-accent/50" : "border-border",
    linkHref && "hover:border-accent/40",
  );

  if (linkHref) {
    return (
      <Link href={linkHref} className={cardCls}>
        {body}
      </Link>
    );
  }
  return <div className={cardCls}>{body}</div>;
}

function TeamRow({
  team,
  side,
  g,
  prob,
  finished,
  live,
  canPick,
  onPick,
}: {
  team: Team | undefined;
  side: "home" | "away";
  g: BracketGameView;
  prob: number | undefined;
  finished: boolean;
  live: boolean;
  canPick: boolean;
  onPick?: (game: number, teamId: string) => void;
}) {
  const isWinner = team != null && g.winnerId === team.id;
  const decided = g.winnerId != null;
  const isLoser = decided && team != null && !isWinner;
  const showScore = (finished || live) && g.homeScore != null && g.awayScore != null;
  const score = showScore ? (side === "home" ? g.homeScore : g.awayScore) : undefined;

  const content = (
    <>
      {team ? (
        <Flag team={team} size="sm" />
      ) : (
        <span className="size-4 shrink-0 rounded-[3px] border border-dashed border-border" />
      )}
      <span
        className={cn(
          "flex-1 truncate",
          isWinner && "font-semibold text-foreground",
          isLoser && "text-muted",
          !team && "italic text-muted",
        )}
      >
        {team?.name ?? "A definir"}
      </span>
      {showScore ? (
        <span
          className={cn(
            "shrink-0 font-mono tabular-nums",
            isWinner ? "font-semibold text-foreground" : "text-muted",
          )}
        >
          {score}
        </span>
      ) : prob != null ? (
        <span className="shrink-0 font-mono text-[11px] tabular-nums text-muted">
          {pct(prob)}
        </span>
      ) : null}
    </>
  );

  const cls = cn(
    "flex w-full items-center gap-2 px-2.5 py-2 text-left transition-colors",
    isWinner && "bg-accent/10",
    canPick && "cursor-pointer hover:bg-surface-2",
  );

  if (canPick && team && onPick) {
    return (
      <button type="button" className={cls} onClick={() => onPick(g.game, team.id)}>
        {content}
      </button>
    );
  }
  return <div className={cls}>{content}</div>;
}
