import Link from "next/link";

import { Flag } from "@/components/Flag";
import type { RecentResult } from "@/lib/data";
import { formatDate, stageLabel } from "@/lib/utils";

/** Feed "O que aconteceu": últimos resultados com placar e resumo do pós-jogo. */
export function ResultsFeed({ results }: { results: RecentResult[] }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {results.map(({ match, home, away, recap }) => {
        const hs = match.homeScore ?? 0;
        const as_ = match.awayScore ?? 0;
        return (
          <Link
            key={match.id}
            href={`/match/${match.slug}/`}
            className="group rounded-xl border border-border bg-surface p-4 transition-all hover:-translate-y-0.5 hover:border-accent/40"
          >
            <div className="flex items-center justify-between text-[11px] uppercase tracking-wider text-muted">
              <span>
                {match.group ? `Grupo ${match.group.toUpperCase()}` : stageLabel(match.stage)}
              </span>
              <span>{formatDate(match.kickoff)}</span>
            </div>

            <div className="mt-3 flex items-center justify-between gap-2">
              <span className="flex min-w-0 items-center gap-2">
                <Flag team={home} />
                <span className="truncate font-medium">{home.name}</span>
              </span>
              <span className="shrink-0 font-mono text-sm font-semibold tabular-nums">
                {hs} <span className="text-muted">×</span> {as_}
              </span>
              <span className="flex min-w-0 items-center justify-end gap-2 text-right">
                <span className="truncate font-medium">{away.name}</span>
                <Flag team={away} />
              </span>
            </div>

            {recap?.summary && (
              <p className="mt-3 line-clamp-2 text-xs leading-relaxed text-muted">
                {recap.summary}
              </p>
            )}
          </Link>
        );
      })}
    </div>
  );
}
