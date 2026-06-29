"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { Bracket, type BracketGameView } from "@/components/Bracket";
import { Flag } from "@/components/Flag";
import { BRACKET, KO_MATCHES, advanceProbability } from "@/lib/bracket";
import {
  childGames,
  mapRoundOf32,
  realWinners,
  resolveBracket,
  type KnockoutMapping,
} from "@/lib/knockout";
import { simulateScenarios } from "@/lib/scenarios";
import type { Match, Team } from "@/lib/types";
import { cn, pct, withBasePath } from "@/lib/utils";

/** Vencedores forçados (palpites do usuário): número do jogo → id da seleção. */
type Picks = Map<number, string>;

/**
 * Resolve a chave pra frente a partir dos resultados reais + palpites, PODANDO
 * em cascata qualquer palpite que deixou de ser válido (ex.: o usuário trocou o
 * vencedor de um jogo anterior, e o palpite seguinte apontava para quem caiu).
 * Retorna os palpites limpos e o vencedor de cada jogo.
 */
function forwardResolve(
  mapping: KnockoutMapping,
  real: Map<number, string>,
  picks: Picks,
): { cleaned: Picks; winner: Map<number, string> } {
  const cleaned: Picks = new Map(picks);
  const winner = new Map<number, string>();

  for (const num of KO_MATCHES) {
    const stage = BRACKET[num].stage;
    let a: string | undefined;
    let b: string | undefined;
    if (stage === "round_of_32") {
      const m = mapping.matchByGame.get(num);
      a = m?.homeId;
      b = m?.awayId;
    } else {
      const c = childGames(num)!;
      a = winner.get(c[0]);
      b = winner.get(c[1]);
    }

    if (real.has(num)) {
      winner.set(num, real.get(num)!);
      continue;
    }
    const p = cleaned.get(num);
    if (p != null && (p === a || p === b)) winner.set(num, p);
    else if (p != null) cleaned.delete(num); // palpite virou inválido → some
  }

  return { cleaned, winner };
}

/** Preenche todos os jogos em aberto com o favorito do modelo (forward). */
function fillFavorites(
  mapping: KnockoutMapping,
  real: Map<number, string>,
  eloById: Map<string, number>,
): Picks {
  const picks: Picks = new Map();
  const winner = new Map<number, string>(real);

  for (const num of KO_MATCHES) {
    if (real.has(num)) continue;
    const stage = BRACKET[num].stage;
    let a: string | undefined;
    let b: string | undefined;
    if (stage === "round_of_32") {
      const m = mapping.matchByGame.get(num);
      a = m?.homeId;
      b = m?.awayId;
    } else {
      const c = childGames(num)!;
      a = winner.get(c[0]);
      b = winner.get(c[1]);
    }
    if (a == null || b == null) continue;
    const fav = advanceProbability(eloById.get(a)!, eloById.get(b)!) >= 0.5 ? a : b;
    picks.set(num, fav);
    winner.set(num, fav);
  }
  return picks;
}

export default function SimulatorPage() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [picks, setPicks] = useState<Picks>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch(withBasePath("/data/teams.json")).then((r) => r.json()),
      fetch(withBasePath("/data/matches.json")).then((r) => r.json()),
    ])
      .then(([t, m]: [Team[], Match[]]) => {
        setTeams(t);
        setMatches(m);
        setLoading(false);
      })
      .catch(() => {
        setError(true);
        setLoading(false);
      });
  }, []);

  const teamById = useMemo(() => new Map(teams.map((t) => [t.id, t])), [teams]);
  const eloById = useMemo(() => new Map(teams.map((t) => [t.id, t.elo])), [teams]);

  const mapping = useMemo(
    () => (teams.length ? mapRoundOf32(teams, matches) : null),
    [teams, matches],
  );
  const real = useMemo(
    () => (mapping ? realWinners(mapping) : new Map<number, string>()),
    [mapping],
  );
  const realSet = useMemo(() => new Set(real.keys()), [real]);

  const { winner } = useMemo(
    () =>
      mapping
        ? forwardResolve(mapping, real, picks)
        : { cleaned: new Map(), winner: new Map<number, string>() },
    [mapping, real, picks],
  );

  /** Visão do quadro: pares resolvidos + jogos abertos marcados como clicáveis. */
  const games: BracketGameView[] = useMemo(() => {
    if (!mapping) return [];
    const slots = resolveBracket(mapping, winner);
    return [...slots.values()].map((s) => {
      const m = mapping.matchByGame.get(s.game);
      return {
        game: s.game,
        stage: s.stage,
        aId: s.a,
        bId: s.b,
        winnerId: s.winner,
        slug: m?.slug,
        status: m?.status,
        homeScore: m?.homeScore,
        awayScore: m?.awayScore,
        kickoff: m?.kickoff,
        pickable: !realSet.has(s.game) && s.a != null && s.b != null,
      };
    });
  }, [mapping, winner, realSet]);

  /** Sua chance de título por seleção (Monte Carlo reagindo aos palpites). */
  const scenarios = useMemo(
    () =>
      teams.length
        ? simulateScenarios(teams, matches, {
            forcedWinners: picks,
            nSims: 2000,
            seed: 0x00c0_0a26,
          })
        : new Map(),
    [teams, matches, picks],
  );

  const titleChances = useMemo(
    () =>
      teams
        .map((t) => ({ team: t, champion: scenarios.get(t.id)?.champion ?? 0 }))
        .filter((x) => x.champion > 0)
        .sort((a, b) => b.champion - a.champion)
        .slice(0, 8),
    [teams, scenarios],
  );

  const championId = winner.get(104);
  const champion = championId ? teamById.get(championId) : undefined;
  const pickCount = picks.size;

  const onPick = (game: number, teamId: string) => {
    setPicks((prev) => {
      if (!mapping) return prev;
      const next = new Map(prev);
      // Clicar de novo no mesmo vencedor desfaz o palpite.
      if (next.get(game) === teamId) next.delete(game);
      else next.set(game, teamId);
      return forwardResolve(mapping, real, next).cleaned;
    });
  };

  if (error) {
    return (
      <div className="container-content py-24 text-center">
        <p className="text-muted">Não foi possível carregar os dados do simulador.</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-4 rounded-lg border border-border px-4 py-2 text-sm text-foreground transition-colors hover:bg-surface-2"
        >
          Tentar de novo
        </button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="container-content py-12" aria-busy="true">
        <div className="h-3 w-24 animate-pulse rounded bg-surface-2" />
        <div className="mt-4 h-10 w-2/3 max-w-lg animate-pulse rounded bg-surface-2" />
        <div className="mt-4 h-4 w-full max-w-xl animate-pulse rounded bg-surface-2" />
        <div className="mt-10 h-72 animate-pulse rounded-xl bg-surface" />
        <span className="sr-only">Carregando simulador…</span>
      </div>
    );
  }

  return (
    <div className="container-content animate-fade-up py-12">
      <p className="text-xs uppercase tracking-eyebrow text-muted">Simulador</p>
      <h1 className="mt-3 max-w-2xl font-display text-3xl font-bold tracking-tight sm:text-5xl">
        Monte o seu mata-mata
      </h1>
      <p className="mt-4 max-w-xl text-muted">
        Clique no vencedor de cada jogo e a chave avança até a final. Os resultados
        já decididos vêm travados. A cada palpite, a chance de título de cada
        seleção é recalculada no seu navegador.
      </p>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <button
          onClick={() => mapping && setPicks(fillFavorites(mapping, real, eloById))}
          className="rounded-lg border border-accent/40 bg-accent/10 px-3 py-1.5 text-sm font-medium text-accent transition-colors hover:bg-accent/15"
        >
          Preencher com o favorito do modelo
        </button>
        {pickCount > 0 && (
          <button
            onClick={() => setPicks(new Map())}
            className="rounded-lg border border-border px-3 py-1.5 text-sm text-muted transition-colors hover:bg-surface-2 hover:text-foreground"
          >
            Limpar palpites
          </button>
        )}
        <p className="font-mono text-xs tabular-nums text-muted">
          {pickCount > 0 ? `${pickCount} jogo(s) projetado(s)` : "nenhum palpite ainda"}
        </p>
      </div>

      {/* Seu campeão */}
      <div
        className={cn(
          "mt-6 flex items-center gap-3 rounded-2xl border p-4 transition-colors",
          champion ? "border-accent/40 bg-accent/5" : "border-dashed border-border",
        )}
      >
        {champion ? (
          <>
            <Flag team={champion} size="lg" />
            <div>
              <p className="text-xs uppercase tracking-wider text-muted">Seu campeão</p>
              <p className="font-display text-xl font-bold tracking-tight">
                {champion.name}
              </p>
            </div>
          </>
        ) : (
          <p className="text-sm text-muted">
            Preencha o quadro até a final para coroar o seu campeão.
          </p>
        )}
      </div>

      {/* Quadro interativo */}
      <section className="mt-10">
        <Bracket games={games} teams={teams} onPick={onPick} />
        <p className="mt-4 max-w-2xl text-xs leading-relaxed text-muted">
          A porcentagem é a chance do modelo para cada lado avançar — útil para ver
          quando você está cravando uma zebra. Clique de novo no mesmo time para
          desfazer.{" "}
          <Link href="/methodology/" className="text-accent hover:text-accent-strong">
            Como funciona →
          </Link>
        </p>
      </section>

      {/* Chance de título sob seus palpites */}
      <section className="mt-14">
        <h2 className="font-display text-xl font-semibold tracking-tight">
          Chance de título
        </h2>
        <p className="mt-2 max-w-xl text-sm text-muted">
          Considerando os jogos já decididos e os seus palpites, com o resto do
          mata-mata simulado milhares de vezes.
        </p>
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {titleChances.map(({ team, champion: c }, i) => (
            <div
              key={team.id}
              className={cn(
                "flex items-center gap-3 rounded-xl border bg-surface px-3.5 py-3",
                team.id === championId ? "border-accent/40" : "border-border",
              )}
            >
              <span className="w-4 shrink-0 font-mono text-xs tabular-nums text-muted">
                {i + 1}
              </span>
              <Flag team={team} size="sm" />
              <span className="flex-1 truncate text-sm">{team.name}</span>
              <span className="shrink-0 font-mono text-sm font-semibold tabular-nums text-accent">
                {pct(c, 1)}
              </span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
