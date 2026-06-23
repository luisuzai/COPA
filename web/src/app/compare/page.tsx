"use client";

import { useEffect, useMemo, useState } from "react";

import { Flag } from "@/components/Flag";
import type { Probabilities, Team, TeamProbabilities } from "@/lib/types";
import { cn, pct, withBasePath } from "@/lib/utils";

interface Metric {
  label: string;
  a: number;
  b: number;
  fmt: (v: number) => string;
}

export default function ComparePage() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [probs, setProbs] = useState<Record<string, TeamProbabilities>>({});
  const [aId, setAId] = useState("");
  const [bId, setBId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch(withBasePath("/data/teams.json")).then((r) => r.json()),
      fetch(withBasePath("/data/probabilities.json")).then((r) => r.json()),
    ])
      .then(([t, p]: [Team[], Probabilities]) => {
        setTeams([...t].sort((x, y) => x.name.localeCompare(y.name, "pt-BR")));
        const map: Record<string, TeamProbabilities> = {};
        p.teams.forEach((x) => (map[x.teamId] = x));
        setProbs(map);
        const byTitle = [...p.teams].sort((x, y) => y.champion - x.champion);
        setAId(byTitle[0]?.teamId ?? t[0]?.id ?? "");
        setBId(byTitle[1]?.teamId ?? t[1]?.id ?? "");
        setLoading(false);
      })
      .catch(() => { setError(true); setLoading(false); });
  }, []);

  const teamById = useMemo(() => new Map(teams.map((t) => [t.id, t])), [teams]);

  if (error) {
    return (
      <div className="container-content py-24 text-center">
        <p className="text-muted">Não foi possível carregar os dados do comparador.</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-4 rounded-lg border border-border px-4 py-2 text-sm text-foreground transition-colors hover:bg-surface-2"
        >
          Tentar de novo
        </button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="container-content py-12 sm:py-16" aria-busy="true">
        <div className="h-3 w-28 animate-pulse rounded bg-surface-2" />
        <div className="mt-4 h-12 w-2/3 max-w-md animate-pulse rounded bg-surface-2" />
        <div className="mt-5 h-5 w-full max-w-lg animate-pulse rounded bg-surface-2" />
        <div className="mt-10 grid grid-cols-2 gap-4">
          <div className="h-20 animate-pulse rounded-lg bg-surface" />
          <div className="h-20 animate-pulse rounded-lg bg-surface" />
        </div>
        <div className="mt-8 h-64 animate-pulse rounded-2xl bg-surface" />
        <span className="sr-only">Carregando comparador…</span>
      </div>
    );
  }

  const ta = teamById.get(aId);
  const tb = teamById.get(bId);
  const pa = probs[aId];
  const pb = probs[bId];

  const metrics: Metric[] = [
    { label: "Chance de título", a: pa?.champion ?? 0, b: pb?.champion ?? 0, fmt: (v) => pct(v, 1) },
    { label: "Chega à final", a: pa?.final ?? 0, b: pb?.final ?? 0, fmt: (v) => pct(v) },
    { label: "Chega à semifinal", a: pa?.semi ?? 0, b: pb?.semi ?? 0, fmt: (v) => pct(v) },
    { label: "Classificação", a: pa?.advanceGroup ?? 0, b: pb?.advanceGroup ?? 0, fmt: (v) => pct(v) },
    { label: "Rating Elo", a: ta?.elo ?? 0, b: tb?.elo ?? 0, fmt: (v) => String(Math.round(v)) },
  ];

  return (
    <div className="container-content py-12 sm:py-16">
      <p className="text-xs uppercase tracking-eyebrow text-muted">Comparador</p>
      <h1 className="mt-4 font-display text-4xl font-bold tracking-tight sm:text-5xl">
        Duas seleções, lado a lado
      </h1>
      <p className="mt-5 max-w-2xl text-lg text-muted">
        Escolha duas seleções e compare força e chances em cada fase.
      </p>

      {/* Seletores */}
      <div className="mt-10 grid grid-cols-2 gap-4">
        <TeamPicker
          teams={teams}
          value={aId}
          onChange={setAId}
          team={ta}
          align="left"
          label="Selecionar a primeira seleção"
        />
        <TeamPicker
          teams={teams}
          value={bId}
          onChange={setBId}
          team={tb}
          align="right"
          label="Selecionar a segunda seleção"
        />
      </div>

      {/* Métricas (cabo de guerra) */}
      <div className="mt-8 space-y-5 rounded-2xl border border-border bg-surface p-5 sm:p-6">
        {metrics.map((m) => {
          const total = m.a + m.b || 1;
          const aShare = m.a / total;
          const aWins = m.a > m.b;
          const bWins = m.b > m.a;
          return (
            <div key={m.label}>
              <div className="flex items-center justify-between text-sm">
                <span
                  className={cn(
                    "font-mono font-semibold tabular-nums",
                    aWins ? "text-accent" : "text-foreground",
                  )}
                >
                  {m.fmt(m.a)}
                </span>
                <span className="text-xs uppercase tracking-wider text-muted">
                  {m.label}
                </span>
                <span
                  className={cn(
                    "font-mono font-semibold tabular-nums",
                    bWins ? "text-accent" : "text-foreground",
                  )}
                >
                  {m.fmt(m.b)}
                </span>
              </div>
              <div className="mt-2 flex h-2 overflow-hidden rounded-full">
                <div
                  className={cn(aWins ? "bg-accent" : "bg-accent/50")}
                  style={{ width: `${aShare * 100}%` }}
                />
                <div className="w-px shrink-0 bg-bg" />
                <div
                  className={cn(bWins ? "bg-accent" : "bg-accent/50")}
                  style={{ width: `${(1 - aShare) * 100}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TeamPicker({
  teams,
  value,
  onChange,
  team,
  align,
  label,
}: {
  teams: Team[];
  value: string;
  onChange: (id: string) => void;
  team?: Team;
  align: "left" | "right";
  label: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3",
        align === "right" ? "items-end text-right" : "items-start",
      )}
    >
      <div className={cn("flex items-center gap-3", align === "right" && "flex-row-reverse")}>
        {team && <Flag team={team} size="lg" />}
        <span className="font-display text-xl font-bold tracking-tight">
          {team?.name ?? "—"}
        </span>
      </div>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label={label}
        className="w-full max-w-[14rem] rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none transition-colors hover:border-accent/40"
      >
        {teams.map((t) => (
          <option key={t.id} value={t.id}>
            {t.name}
          </option>
        ))}
      </select>
    </div>
  );
}
