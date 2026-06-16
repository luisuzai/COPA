import type { HistoryPoint } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * Sparkline minimalista da evolução da chance de título.
 * Só renderiza com 2+ pontos (caso contrário não há "tendência" a mostrar).
 */
export function Sparkline({
  points,
  className,
}: {
  points: HistoryPoint[];
  className?: string;
}) {
  if (points.length < 2) return null;

  const w = 100;
  const h = 28;
  const pad = 3;
  const vals = points.map((p) => p.value);
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  const range = max - min || 1;

  const coords = points.map((p, i) => {
    const x = pad + (i / (points.length - 1)) * (w - 2 * pad);
    const y = h - pad - ((p.value - min) / range) * (h - 2 * pad);
    return [x, y] as const;
  });

  const line = coords
    .map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`)
    .join(" ");
  const [lx, ly] = coords[coords.length - 1];

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      preserveAspectRatio="none"
      className={cn("h-8 w-full overflow-visible", className)}
      aria-hidden
    >
      <path
        d={`${line} L${lx.toFixed(1)} ${h} L${coords[0][0].toFixed(1)} ${h} Z`}
        fill="rgb(var(--accent) / 0.12)"
      />
      <path
        d={line}
        fill="none"
        stroke="rgb(var(--accent))"
        strokeWidth={1.5}
        vectorEffect="non-scaling-stroke"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx={lx} cy={ly} r={2.5} fill="rgb(var(--accent))" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}
