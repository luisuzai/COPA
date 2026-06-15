import { ProbabilityBar } from "@/components/charts/ProbabilityBar";
import { cn } from "@/lib/utils";

/**
 * Card de estatística: rótulo, valor grande (mono/tabular) e barra opcional.
 * `accent` destaca o número-chave (ex: chance de título) em azul.
 */
export function StatCard({
  label,
  value,
  bar,
  accent = false,
}: {
  label: string;
  value: string;
  bar?: number;
  accent?: boolean;
}) {
  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <p className="text-xs uppercase tracking-wider text-muted">{label}</p>
      <p
        className={cn(
          "mt-2 font-mono text-2xl font-semibold tabular-nums",
          accent ? "text-accent" : "text-foreground",
        )}
      >
        {value}
      </p>
      {bar !== undefined && <ProbabilityBar value={bar} className="mt-3" />}
    </div>
  );
}
