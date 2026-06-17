import type { Metadata } from "next";
import Link from "next/link";

import { Flag } from "@/components/Flag";
import { getMatches, getPredictionForMatch, getTeamById } from "@/lib/data";
import type { Match } from "@/lib/types";
import { formatDayHeading, formatTime, matchDayKey } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Calendário",
  description:
    "Todos os jogos da Copa do Mundo 2026 em ordem cronológica: resultados e " +
    "próximas partidas, com horário de Brasília.",
};

export default function CalendarPage() {
  const teamById = getTeamById();
  const matches = [...getMatches()].sort((a, b) => a.kickoff.localeCompare(b.kickoff));

  // Agrupa por dia (fuso de Brasília).
  const days: { key: string; iso: string; matches: Match[] }[] = [];
  for (const m of matches) {
    const key = matchDayKey(m.kickoff);
    const last = days[days.length - 1];
    if (last && last.key === key) last.matches.push(m);
    else days.push({ key, iso: m.kickoff, matches: [m] });
  }

  return (
    <div className="container-content py-12 sm:py-16">
      <p className="text-xs uppercase tracking-eyebrow text-muted">Calendário</p>
      <h1 className="mt-4 font-display text-4xl font-bold tracking-tight sm:text-5xl">
        Todos os jogos
      </h1>
      <p className="mt-5 max-w-2xl text-lg text-muted">
        Resultados e próximas partidas em ordem cronológica · horário de Brasília.
      </p>

      <div className="mt-10 space-y-8">
        {days.map((day) => (
          <section key={day.key}>
            <h2 className="mb-3 font-display text-sm font-semibold tracking-tight text-muted first-letter:uppercase">
              {formatDayHeading(day.iso)}
            </h2>
            <div className="divide-y divide-border/60 overflow-hidden rounded-2xl border border-border bg-surface">
              {day.matches.map((m) => {
                const home = teamById.get(m.homeId);
                const away = teamById.get(m.awayId);
                if (!home || !away) return null;
                const finished =
                  m.status === "finished" && m.homeScore != null && m.awayScore != null;
                const pred = !finished ? getPredictionForMatch(m.slug) : undefined;
                return (
                  <Link
                    key={m.id}
                    href={`/match/${m.slug}/`}
                    className="flex items-center gap-3 px-4 py-3 text-sm transition-colors hover:bg-surface-2"
                  >
                    <span className="flex flex-1 items-center justify-end gap-2 truncate text-right">
                      <span className="truncate">{home.name}</span>
                      <Flag team={home} size="sm" />
                    </span>
                    <span className="w-16 shrink-0 text-center font-mono text-sm tabular-nums">
                      {finished ? (
                        <span className="font-semibold">
                          {m.homeScore} <span className="text-muted">×</span> {m.awayScore}
                        </span>
                      ) : (
                        <span className="text-muted">{formatTime(m.kickoff)}</span>
                      )}
                    </span>
                    <span className="flex flex-1 items-center gap-2 truncate">
                      <Flag team={away} size="sm" />
                      <span className="truncate">{away.name}</span>
                    </span>
                    {pred && (
                      <span className="hidden w-12 shrink-0 text-right font-mono text-xs tabular-nums text-muted sm:inline">
                        {Math.round(Math.max(pred.homeWin, pred.draw, pred.awayWin) * 100)}%
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
