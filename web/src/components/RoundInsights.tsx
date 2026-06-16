import Link from "next/link";

import { Flag } from "@/components/Flag";
import type { RoundInsight } from "@/lib/data";
import { cn } from "@/lib/utils";

/** Cards automáticos de "Insights da Rodada" (maior alta, queda, surpresa…). */
export function RoundInsights({ insights }: { insights: RoundInsight[] }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {insights.map((ins) => (
        <Link
          key={ins.label}
          href={`/team/${ins.team.slug}/`}
          className="group rounded-xl border border-border bg-surface p-4 transition-all hover:-translate-y-0.5 hover:border-accent/40"
        >
          <p className="text-[11px] uppercase tracking-wider text-muted">{ins.label}</p>
          <div className="mt-3 flex items-center gap-2.5">
            <Flag team={ins.team} />
            <span className="truncate font-medium transition-colors group-hover:text-accent">
              {ins.team.name}
            </span>
          </div>
          <p
            className={cn(
              "mt-2 font-mono text-lg font-semibold tabular-nums",
              ins.kind === "up"
                ? "text-up"
                : ins.kind === "down"
                  ? "text-down"
                  : "text-foreground",
            )}
          >
            {ins.valueText}
          </p>
          <p className="text-xs text-muted">{ins.sublabel}</p>
        </Link>
      ))}
    </div>
  );
}
