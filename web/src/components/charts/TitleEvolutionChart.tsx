"use client";

import { useId, useRef, useState } from "react";

import type { HistoryPoint } from "@/lib/types";
import { cn, formatDay, pct } from "@/lib/utils";

/**
 * Gráfico da evolução da chance de título.
 * - Eixo Y rotulado (mostra a escala real → uma oscilação de 0,5pp não vira
 *   montanha, como acontecia no sparkline auto-zoom sem rótulos).
 * - Pontos por dia + área com gradiente + cor de tendência (sobe/desce).
 * - Tooltip no hover/toque com data e valor exatos.
 */
export function TitleEvolutionChart({
  points,
  className,
}: {
  points: HistoryPoint[];
  className?: string;
}) {
  const gid = useId();
  const wrapRef = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState<number | null>(null);

  if (points.length < 2) return null;

  const n = points.length;
  const W = 360;
  const H = 140;
  const mL = 34;
  const mR = 10;
  const mT = 12;
  const mB = 20;
  const plotW = W - mL - mR;
  const plotH = H - mT - mB;

  const vals = points.map((p) => p.value);
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  // Folga p/ a linha não colar nas bordas; piso em 0.
  const padV = (max - min) * 0.18 || max * 0.08 || 0.001;
  const dMin = Math.max(0, min - padV);
  const dMax = max + padV;
  const dRange = dMax - dMin || 1;

  const x = (i: number) => mL + (n === 1 ? 0 : (i / (n - 1)) * plotW);
  const y = (v: number) => mT + (1 - (v - dMin) / dRange) * plotH;

  const coords = points.map((p, i) => [x(i), y(p.value)] as const);
  const line = coords
    .map(([cx, cy], i) => `${i ? "L" : "M"}${cx.toFixed(1)} ${cy.toFixed(1)}`)
    .join(" ");
  const area = `${line} L${coords[n - 1][0].toFixed(1)} ${mT + plotH} L${coords[0][0].toFixed(1)} ${mT + plotH} Z`;

  const first = points[0];
  const last = points[n - 1];
  const deltaPp = (last.value - first.value) * 100;
  const dir = deltaPp > 0.05 ? "up" : deltaPp < -0.05 ? "down" : "neutral";
  const cssVar = dir === "up" ? "--up" : dir === "down" ? "--down" : "--accent";
  const stroke = `rgb(var(${cssVar}))`;
  const deltaText = `${deltaPp >= 0 ? "+" : "−"}${Math.abs(deltaPp)
    .toFixed(1)
    .replace(".", ",")} pp`;

  const grid = [dMax, (dMax + dMin) / 2, dMin];

  const onMove = (clientX: number) => {
    const rect = wrapRef.current?.getBoundingClientRect();
    if (!rect || rect.width === 0) return;
    const frac = (clientX - rect.left) / rect.width;
    const idx = Math.round(frac * (n - 1));
    setHover(Math.max(0, Math.min(n - 1, idx)));
  };

  const showAllDates = n <= 5;

  return (
    <figure className={cn("not-prose", className)}>
      <div
        ref={wrapRef}
        className="relative"
        onPointerMove={(e) => onMove(e.clientX)}
        onPointerLeave={() => setHover(null)}
      >
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="h-auto w-full touch-none"
          role="img"
          aria-label={`Evolução da chance de título de ${formatDay(first.date)} (${pct(
            first.value,
            1,
          )}) a ${formatDay(last.date)} (${pct(last.value, 1)}).`}
        >
          <defs>
            <linearGradient id={`grad-${gid}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={stroke} stopOpacity={0.22} />
              <stop offset="100%" stopColor={stroke} stopOpacity={0} />
            </linearGradient>
          </defs>

          {/* Grade horizontal + rótulos da escala */}
          {grid.map((g, i) => {
            const gy = y(g);
            return (
              <g key={i}>
                <line
                  x1={mL}
                  y1={gy}
                  x2={W - mR}
                  y2={gy}
                  stroke="rgb(var(--border))"
                  strokeWidth={1}
                  strokeDasharray={i === 2 ? "0" : "2 3"}
                  vectorEffect="non-scaling-stroke"
                />
                <text
                  x={mL - 6}
                  y={gy + 3}
                  textAnchor="end"
                  className="fill-muted font-mono"
                  fontSize={9}
                >
                  {pct(g, 1)}
                </text>
              </g>
            );
          })}

          {/* Área + linha */}
          <path d={area} fill={`url(#grad-${gid})`} />
          <path
            d={line}
            fill="none"
            stroke={stroke}
            strokeWidth={2}
            vectorEffect="non-scaling-stroke"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Guia vertical no ponto sob o cursor */}
          {hover !== null && (
            <line
              x1={coords[hover][0]}
              y1={mT}
              x2={coords[hover][0]}
              y2={mT + plotH}
              stroke="rgb(var(--muted) / 0.4)"
              strokeWidth={1}
              vectorEffect="non-scaling-stroke"
            />
          )}

          {/* Pontos */}
          {coords.map(([cx, cy], i) => (
            <circle
              key={i}
              cx={cx}
              cy={cy}
              r={hover === i ? 4 : 2.6}
              fill={hover === i ? stroke : "rgb(var(--bg))"}
              stroke={stroke}
              strokeWidth={hover === i ? 0 : 1.6}
              vectorEffect="non-scaling-stroke"
            />
          ))}

          {/* Rótulos de data no eixo X */}
          {points.map((p, i) => {
            if (!showAllDates && i !== 0 && i !== n - 1) return null;
            const anchor = i === 0 ? "start" : i === n - 1 ? "end" : "middle";
            return (
              <text
                key={i}
                x={x(i)}
                y={H - 4}
                textAnchor={anchor}
                className={cn(
                  "font-mono",
                  hover === i ? "fill-foreground" : "fill-muted",
                )}
                fontSize={8}
              >
                {formatDay(p.date)}
              </text>
            );
          })}
        </svg>

        {/* Tooltip */}
        {hover !== null && (
          <div
            className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full rounded-lg border border-border bg-surface-2 px-2.5 py-1.5 text-center shadow-lg"
            style={{
              left: `${(coords[hover][0] / W) * 100}%`,
              top: `${(coords[hover][1] / H) * 100}%`,
              marginTop: "-8px",
            }}
          >
            <div className="font-mono text-sm font-semibold tabular-nums text-foreground">
              {pct(points[hover].value, 1)}
            </div>
            <div className="whitespace-nowrap text-[10px] text-muted">
              {formatDay(points[hover].date)}
            </div>
          </div>
        )}
      </div>

      <figcaption className="mt-3 flex items-center justify-between gap-2 font-mono text-xs tabular-nums text-muted">
        <span>
          {formatDay(first.date)} · {pct(first.value, 1)}
        </span>
        <span
          className={cn(
            "rounded-full px-2 py-0.5 text-[11px] font-medium",
            dir === "up" && "bg-up/10 text-up",
            dir === "down" && "bg-down/10 text-down",
            dir === "neutral" && "bg-border/40 text-muted",
          )}
        >
          {deltaText}
        </span>
        <span className="text-accent">
          {formatDay(last.date)} · {pct(last.value, 1)}
        </span>
      </figcaption>
    </figure>
  );
}
