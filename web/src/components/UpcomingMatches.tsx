import Link from "next/link";

import { Flag } from "@/components/Flag";
import { VersusBar } from "@/components/charts/VersusBar";
import type { UpcomingMatch } from "@/lib/data";
import { formatDate, stageLabel } from "@/lib/utils";

/** Dashboard dos próximos jogos com a expectativa de resultado. */
export function UpcomingMatches({ matches }: { matches: UpcomingMatch[] }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {matches.map(({ match, home, away, prediction }) => (
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
            <span className="shrink-0 font-mono text-xs text-muted">x</span>
            <span className="flex min-w-0 items-center justify-end gap-2 text-right">
              <span className="truncate font-medium">{away.name}</span>
              <Flag team={away} />
            </span>
          </div>

          {prediction && (
            <div className="mt-4">
              <VersusBar
                homeWin={prediction.homeWin}
                draw={prediction.draw}
                awayWin={prediction.awayWin}
              />
            </div>
          )}
        </Link>
      ))}
    </div>
  );
}
