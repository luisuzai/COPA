import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Flag } from "@/components/Flag";
import { ProbabilityBar } from "@/components/charts/ProbabilityBar";
import { getGroupMatches, getGroups, getStandings, getTeamById } from "@/lib/data";
import type { GroupId } from "@/lib/types";
import { formatDate, pct } from "@/lib/utils";

export function generateStaticParams() {
  return getGroups().map((id) => ({ id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  return {
    title: `Grupo ${id.toUpperCase()}`,
    description: `Classificação, jogos e chances de avançar do Grupo ${id.toUpperCase()} da Copa 2026.`,
  };
}

export default async function GroupPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const groupId = id as GroupId;
  if (!getGroups().includes(groupId)) notFound();

  const standings = getStandings(groupId);
  const matches = getGroupMatches(groupId);
  const teamById = getTeamById();

  return (
    <>
      <section className="container-content animate-fade-up pb-6 pt-12 sm:pt-16">
        <p className="text-xs uppercase tracking-eyebrow text-muted">Copa do Mundo 2026</p>
        <h1 className="mt-3 font-display text-4xl font-bold tracking-tight sm:text-5xl">
          Grupo {groupId.toUpperCase()}
        </h1>
      </section>

      {/* Classificação */}
      <section className="container-content py-6">
        <div className="overflow-hidden rounded-2xl border border-border bg-surface">
          <div className="flex items-center gap-3 border-b border-border px-4 py-3 text-[11px] uppercase tracking-wider text-muted">
            <span className="w-5">#</span>
            <span className="flex-1">Seleção</span>
            <span className="hidden w-8 text-center sm:inline">J</span>
            <span className="hidden w-8 text-center sm:inline">SG</span>
            <span className="w-8 text-center">P</span>
            <span className="hidden w-28 text-right sm:inline">Avança</span>
          </div>
          {standings.map((row, i) => (
            <Link
              key={row.team.id}
              href={`/team/${row.team.slug}/`}
              className="flex items-center gap-3 border-b border-border/50 px-4 py-3 transition-colors last:border-0 hover:bg-surface-2"
            >
              <span
                className={`w-5 font-mono text-sm tabular-nums ${
                  i < 2 ? "text-accent" : "text-muted"
                }`}
              >
                {i + 1}
              </span>
              <span className="flex flex-1 items-center gap-2.5">
                <Flag team={row.team} />
                <span className="truncate font-medium">{row.team.name}</span>
              </span>
              <span className="hidden w-8 text-center font-mono text-sm tabular-nums text-muted sm:inline">
                {row.played}
              </span>
              <span className="hidden w-8 text-center font-mono text-sm tabular-nums text-muted sm:inline">
                {row.gd > 0 ? `+${row.gd}` : row.gd}
              </span>
              <span className="w-8 text-center font-mono text-sm font-semibold tabular-nums">
                {row.points}
              </span>
              <span className="hidden w-28 items-center justify-end gap-2 sm:flex">
                <ProbabilityBar value={row.advanceGroup} className="w-16" />
                <span className="font-mono text-xs tabular-nums text-muted">
                  {pct(row.advanceGroup)}
                </span>
              </span>
            </Link>
          ))}
        </div>
        <p className="mt-2 text-xs text-muted">Os 2 primeiros avançam diretamente (azul).</p>
      </section>

      {/* Jogos */}
      <section className="container-content py-6">
        <h2 className="mb-3 font-display text-lg font-semibold tracking-tight">Jogos</h2>
        <div className="divide-y divide-border/60 rounded-2xl border border-border bg-surface">
          {matches.map((m) => {
            const home = teamById.get(m.homeId);
            const away = teamById.get(m.awayId);
            if (!home || !away) return null;
            return (
              <Link
                key={m.id}
                href={`/match/${m.slug}/`}
                className="flex items-center justify-between px-4 py-3 text-sm transition-colors hover:bg-surface-2"
              >
                <span className="flex flex-1 items-center justify-end gap-2">
                  <span className="truncate text-right">{home.name}</span>
                  <Flag team={home} size="sm" />
                </span>
                <span className="mx-3 shrink-0 font-mono text-sm tabular-nums text-muted">
                  {m.status === "finished" ? `${m.homeScore} · ${m.awayScore}` : formatDate(m.kickoff)}
                </span>
                <span className="flex flex-1 items-center gap-2">
                  <Flag team={away} size="sm" />
                  <span className="truncate">{away.name}</span>
                </span>
              </Link>
            );
          })}
        </div>
      </section>
    </>
  );
}
