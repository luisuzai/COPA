import type { Metadata } from "next";
import Link from "next/link";

import { Bracket, type BracketGameView } from "@/components/Bracket";
import { Flag } from "@/components/Flag";
import {
  getFavorites,
  getGroups,
  getMatches,
  getStandings,
  getTeams,
} from "@/lib/data";
import { mapRoundOf32, realWinners, resolveBracket } from "@/lib/knockout";
import { cn, pct } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Chaveamento",
  description:
    "O mata-mata da Copa do Mundo 2026: a chave oficial das 16-avos à final, " +
    "com os resultados e a chance do modelo em cada confronto.",
};

export default function BracketPage() {
  const teams = getTeams();
  const matches = getMatches();

  // Chave real: pares das 16-avos + vencedores já decididos → árvore resolvida.
  const mapping = mapRoundOf32(teams, matches);
  const slots = resolveBracket(mapping, realWinners(mapping));

  const games: BracketGameView[] = [...slots.values()].map((s) => {
    const real = mapping.matchByGame.get(s.game);
    return {
      game: s.game,
      stage: s.stage,
      aId: s.a,
      bId: s.b,
      winnerId: s.winner,
      slug: real?.slug,
      status: real?.status,
      homeScore: real?.homeScore,
      awayScore: real?.awayScore,
      kickoff: real?.kickoff,
    };
  });

  // Quem chegou ao mata-mata (aparece em algum jogo das 16-avos).
  const qualified = new Set<string>();
  for (const m of matches) {
    if (m.stage !== "round_of_32") continue;
    qualified.add(m.homeId);
    qualified.add(m.awayId);
  }

  const favorites = getFavorites().slice(0, 8);
  const groups = getGroups();

  return (
    <div className="container-content py-12 sm:py-16">
      <p className="text-xs uppercase tracking-eyebrow text-muted">Copa do Mundo 2026</p>
      <h1 className="mt-4 font-display text-4xl font-bold tracking-tight sm:text-5xl">
        O mata-mata
      </h1>
      <p className="mt-5 max-w-2xl text-lg text-muted">
        A chave oficial das 16-avos à final. Resultados já decididos e, nos jogos
        que faltam, a chance do modelo para cada lado avançar.
      </p>

      {/* Quadro do mata-mata */}
      <section className="mt-10">
        <Bracket games={games} teams={teams} />
        <p className="mt-4 max-w-2xl text-xs leading-relaxed text-muted">
          A porcentagem em cada lado é a chance daquela seleção passar do confronto
          (vitória no tempo normal ou nos pênaltis). Quer testar suas próprias
          previsões?{" "}
          <Link href="/simulator/" className="text-accent hover:text-accent-strong">
            Abra o simulador →
          </Link>
        </p>
      </section>

      {/* Favoritos ao título */}
      <section className="mt-14">
        <h2 className="font-display text-xl font-semibold tracking-tight">
          Favoritos ao título
        </h2>
        <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {favorites.map((f, i) => (
            <Link
              key={f.team.id}
              href={`/team/${f.team.slug}/`}
              className="group flex items-center gap-3 rounded-xl border border-border bg-surface px-3.5 py-3 transition-colors hover:border-accent/40"
            >
              <span className="w-4 shrink-0 font-mono text-xs tabular-nums text-muted">
                {i + 1}
              </span>
              <Flag team={f.team} size="sm" />
              <span className="flex-1 truncate text-sm transition-colors group-hover:text-accent">
                {f.team.name}
              </span>
              <span className="shrink-0 font-mono text-sm font-semibold tabular-nums text-accent">
                {pct(f.champion, 1)}
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* Arquivo: tabelas finais dos grupos */}
      <section className="mt-14">
        <h2 className="font-display text-xl font-semibold tracking-tight">
          Como chegamos aqui
        </h2>
        <p className="mt-2 max-w-2xl text-sm text-muted">
          A classificação final dos 12 grupos. Em azul, as seleções que avançaram
          ao mata-mata (os 2 primeiros de cada grupo e os 8 melhores 3º colocados).
        </p>
        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {groups.map((g) => {
            const standings = getStandings(g);
            return (
              <div key={g} className="rounded-2xl border border-border bg-surface p-5">
                <Link
                  href={`/group/${g}/`}
                  className="group flex items-center justify-between"
                >
                  <h3 className="font-display text-base font-semibold tracking-tight">
                    Grupo {g.toUpperCase()}
                  </h3>
                  <span className="text-xs text-muted transition-colors group-hover:text-accent">
                    ver grupo →
                  </span>
                </Link>
                <div className="mt-4 space-y-2.5">
                  {standings.map((row, i) => {
                    const isQualified = qualified.has(row.team.id);
                    return (
                      <Link
                        key={row.team.id}
                        href={`/team/${row.team.slug}/`}
                        className="group flex items-center gap-2.5"
                      >
                        <span
                          className={cn(
                            "w-4 shrink-0 font-mono text-xs tabular-nums",
                            isQualified ? "text-accent" : "text-muted",
                          )}
                        >
                          {i + 1}
                        </span>
                        <Flag team={row.team} size="sm" />
                        <span
                          className={cn(
                            "flex-1 truncate text-sm transition-colors group-hover:text-accent",
                            !isQualified && "text-muted",
                          )}
                        >
                          {row.team.name}
                        </span>
                        {isQualified && (
                          <span className="size-1.5 shrink-0 rounded-full bg-accent" aria-hidden />
                        )}
                        <span className="w-6 shrink-0 text-right font-mono text-xs tabular-nums text-muted">
                          {row.points}
                        </span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
