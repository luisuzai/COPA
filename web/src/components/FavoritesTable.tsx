import Link from "next/link";

import { Delta } from "@/components/Delta";
import { ProbabilityBar } from "@/components/charts/ProbabilityBar";
import type { FavoriteRow } from "@/lib/types";
import { pct } from "@/lib/utils";

/**
 * Tabela de favoritos — o herói funcional da Home.
 * Layout em flex (não grid) p/ esconder a barra em mobile sem quebrar colunas:
 * no celular a barra vai sob o nome; no desktop vira coluna própria.
 */
export function FavoritesTable({ rows }: { rows: FavoriteRow[] }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-surface">
      {/* Cabeçalho (só desktop) */}
      <div className="hidden items-center gap-4 border-b border-border px-5 py-3 text-[11px] uppercase tracking-wider text-muted sm:flex">
        <span className="w-6">#</span>
        <span className="flex-1">Seleção</span>
        <span className="w-40">Chance de título</span>
        <span className="w-14 text-right">Título</span>
        <span className="w-16 text-right">Var.</span>
      </div>

      {rows.map((row) => (
        <Link
          key={row.team.id}
          href={`/team/${row.team.slug}/`}
          className="group flex items-center gap-3 border-b border-border/50 px-4 py-3.5 transition-colors last:border-0 hover:bg-surface-2 sm:gap-4 sm:px-5"
        >
          <span className="w-6 shrink-0 font-mono text-sm tabular-nums text-muted">
            {row.rank}
          </span>

          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <div className="flex items-center gap-2.5">
              <span className="text-lg leading-none">{row.team.flag}</span>
              <span className="truncate font-medium text-foreground transition-colors group-hover:text-accent">
                {row.team.name}
              </span>
            </div>
            <ProbabilityBar value={row.champion} className="sm:hidden" />
          </div>

          <ProbabilityBar value={row.champion} className="hidden w-40 shrink-0 sm:block" />

          <span className="w-14 shrink-0 text-right font-mono text-sm font-semibold tabular-nums text-foreground sm:text-base">
            {pct(row.champion, 1)}
          </span>

          <div className="w-16 shrink-0 text-right">
            <Delta value={row.championChange} />
          </div>
        </Link>
      ))}
    </div>
  );
}
