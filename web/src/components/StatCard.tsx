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
  note,
  accent = false,
}: {
  label: string;
  value: string;
  bar?: number;
  /** Linha de narrativa opcional (ex: "1 a cada 8 Copas"). */
  note?: string;
  accent?: boolean;
}) {
  return (
    <div className="rounded-xl border border-border bg-surface p-4 transition-colors hover:border-accent/40">
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
      {note && <p className="mt-2 text-[11px] leading-tight text-muted">{note}</p>}
    </div>
  );
}
