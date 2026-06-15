import { cn } from "@/lib/utils";

/**
 * Barra de probabilidade minimalista. Preenchimento em azul translúcido sobre
 * um trilho cinza — responde "quão favorito?" num relance, sem eixos nem grid.
 */
export function ProbabilityBar({
  value,
  className,
}: {
  value: number;
  className?: string;
}) {
  const width = `${Math.max(0, Math.min(1, value)) * 100}%`;
  return (
    <div
      className={cn("h-1.5 w-full overflow-hidden rounded-full bg-surface-2", className)}
      role="progressbar"
      aria-valuenow={Math.round(value * 100)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div className="h-full rounded-full bg-accent/80" style={{ width }} />
    </div>
  );
}
