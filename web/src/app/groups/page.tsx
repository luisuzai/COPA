import type { Metadata } from "next";
import Link from "next/link";

import { Flag } from "@/components/Flag";
import { ProbabilityBar } from "@/components/charts/ProbabilityBar";
import { getGroups, getStandings } from "@/lib/data";
import { cn, pct } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Grupos",
  description:
    "Os 12 grupos da Copa do Mundo 2026: classificação atual e chance de cada " +
    "seleção avançar para o mata-mata.",
};

export default function GroupsPage() {
  const groups = getGroups();

  return (
    <div className="container-content py-12 sm:py-16">
      <p className="text-xs uppercase tracking-eyebrow text-muted">Copa do Mundo 2026</p>
      <h1 className="mt-4 font-display text-4xl font-bold tracking-tight sm:text-5xl">
        Os 12 grupos
      </h1>
      <p className="mt-5 max-w-2xl text-lg text-muted">
        Classificação atual e a chance de cada seleção avançar para o mata-mata.
      </p>

      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {groups.map((g) => {
          const standings = getStandings(g);
          return (
            <div key={g} className="rounded-2xl border border-border bg-surface p-5">
              <Link
                href={`/group/${g}/`}
                className="group flex items-center justify-between"
              >
                <h2 className="font-display text-base font-semibold tracking-tight">
                  Grupo {g.toUpperCase()}
                </h2>
                <span className="text-xs text-muted transition-colors group-hover:text-accent">
                  ver grupo →
                </span>
              </Link>

              <div className="mt-4 space-y-3">
                {standings.map((row, i) => (
                  <Link
                    key={row.team.id}
                    href={`/team/${row.team.slug}/`}
                    className="group flex items-center gap-2.5"
                  >
                    <span
                      className={cn(
                        "w-4 shrink-0 font-mono text-xs tabular-nums",
                        i < 2 ? "text-accent" : "text-muted",
                      )}
                    >
                      {i + 1}
                    </span>
                    <Flag team={row.team} size="sm" />
                    <span className="flex-1 truncate text-sm transition-colors group-hover:text-accent">
                      {row.team.name}
                    </span>
                    <ProbabilityBar value={row.advanceGroup} className="w-10 shrink-0" />
                    <span className="w-9 shrink-0 text-right font-mono text-xs tabular-nums text-muted">
                      {pct(row.advanceGroup)}
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <p className="mt-6 max-w-2xl text-xs leading-relaxed text-muted">
        Os 2 primeiros de cada grupo (em azul) avançam direto ao mata-mata. Os{" "}
        <span className="text-foreground">8 melhores terceiros</span> entre os 12
        grupos completam as 32 vagas — por isso a chance de avançar inclui esse
        caminho, e um 3º colocado forte pode passar de 50%.{" "}
        <Link href="/methodology/" className="text-accent transition-colors hover:text-accent-strong">
          Como funciona →
        </Link>
      </p>
    </div>
  );
}
