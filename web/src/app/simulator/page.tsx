"use client";

import { useEffect, useMemo, useState } from "react";

import { Flag } from "@/components/Flag";
import type { Match, MatchPrediction, Predictions, Team } from "@/lib/types";
import { cn, withBasePath } from "@/lib/utils";

type Outcome = "home" | "draw" | "away";

interface Row {
  team: Team;
  played: number;
  gd: number;
  points: number;
}

/** Classificação recalculada a partir de jogos finalizados + palpites do usuário. */
function computeStandings(
  teams: Team[],
  matches: Match[],
  picks: Record<string, Outcome>,
): Row[] {
  const rows = new Map<string, Row>(
    teams.map((t) => [t.id, { team: t, played: 0, gd: 0, points: 0 }]),
  );

  for (const m of matches) {
    const home = rows.get(m.homeId);
    const away = rows.get(m.awayId);
    if (!home || !away) continue;

    if (m.status === "finished" && m.homeScore != null && m.awayScore != null) {
      home.played++; away.played++;
      home.gd += m.homeScore - m.awayScore;
      away.gd += m.awayScore - m.homeScore;
      if (m.homeScore > m.awayScore) home.points += 3;
      else if (m.homeScore < m.awayScore) away.points += 3;
      else { home.points++; away.points++; }
    } else if (picks[m.slug]) {
      home.played++; away.played++;
      const o = picks[m.slug];
      if (o === "home") home.points += 3;
      else if (o === "away") away.points += 3;
      else { home.points++; away.points++; }
    }
  }

  return [...rows.values()].sort((a, b) => b.points - a.points || b.gd - a.gd);
}

const mostLikely = (p: MatchPrediction): Outcome =>
  p.homeWin >= p.draw && p.homeWin >= p.awayWin
    ? "home"
    : p.draw >= p.awayWin
      ? "draw"
      : "away";

export default function SimulatorPage() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [picks, setPicks] = useState<Record<string, Outcome>>({});
  const [defaults, setDefaults] = useState<Record<string, Outcome>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch(withBasePath("/data/teams.json")).then((r) => r.json()),
      fetch(withBasePath("/data/matches.json")).then((r) => r.json()),
      fetch(withBasePath("/data/predictions.json")).then((r) => r.json()),
    ])
      .then(([t, m, p]: [Team[], Match[], Predictions]) => {
        const predBySlug = new Map(p.matches.map((x) => [x.matchSlug, x]));
        const def: Record<string, Outcome> = {};
        for (const mm of m) {
          if (mm.stage === "group" && mm.status !== "finished") {
            const pr = predBySlug.get(mm.slug);
            def[mm.slug] = pr ? mostLikely(pr) : "draw";
          }
        }
        setTeams(t); setMatches(m); setDefaults(def); setPicks(def);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const teamById = useMemo(() => new Map(teams.map((t) => [t.id, t])), [teams]);
  const groups = useMemo(
    () => [...new Set(teams.map((t) => t.group))].sort(),
    [teams],
  );

  if (loading) {
    return (
      <div className="container-content py-24 text-center text-muted">
        Carregando simulador…
      </div>
    );
  }

  return (
    <div className="container-content py-12">
      <p className="text-xs uppercase tracking-eyebrow text-muted">Simulador</p>
      <h1 className="mt-3 max-w-2xl font-display text-3xl font-bold tracking-tight sm:text-5xl">
        E se o resultado fosse outro?
      </h1>
      <p className="mt-4 max-w-xl text-muted">
        Altere os resultados dos jogos e veja a classificação dos grupos mudar.
        Tudo é recalculado no seu navegador — nada é enviado a servidor algum.
      </p>
      <button
        onClick={() => setPicks(defaults)}
        className="mt-5 rounded-lg border border-border px-3 py-1.5 text-sm text-muted transition-colors hover:bg-surface-2 hover:text-foreground"
      >
        Restaurar previsão do modelo
      </button>

      <div className="mt-10 space-y-12">
        {groups.map((g) => {
          const groupTeams = teams.filter((t) => t.group === g);
          const groupMatches = matches.filter(
            (m) => m.stage === "group" && m.group === g,
          );
          const standings = computeStandings(groupTeams, groupMatches, picks);
          const scheduled = groupMatches.filter((m) => m.status !== "finished");

          return (
            <section key={g} className="grid gap-6 lg:grid-cols-2">
              {/* Jogos editáveis */}
              <div>
                <h2 className="mb-3 font-display text-lg font-semibold tracking-tight">
                  Grupo {g.toUpperCase()} · jogos
                </h2>
                <div className="space-y-2">
                  {scheduled.map((m) => {
                    const home = teamById.get(m.homeId);
                    const away = teamById.get(m.awayId);
                    if (!home || !away) return null;
                    return (
                      <div
                        key={m.id}
                        className="flex items-center justify-between gap-2 rounded-xl border border-border bg-surface px-3 py-2.5"
                      >
                        <span className="flex flex-1 items-center justify-end gap-2 truncate text-sm">
                          <span className="truncate">{home.name}</span>
                          <Flag team={home} size="sm" />
                        </span>
                        <Picker
                          value={picks[m.slug]}
                          onChange={(o) => setPicks((prev) => ({ ...prev, [m.slug]: o }))}
                        />
                        <span className="flex flex-1 items-center gap-2 truncate text-sm">
                          <Flag team={away} size="sm" />
                          <span className="truncate">{away.name}</span>
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Classificação resultante */}
              <div>
                <h2 className="mb-3 font-display text-lg font-semibold tracking-tight">
                  Classificação
                </h2>
                <div className="overflow-hidden rounded-xl border border-border bg-surface">
                  {standings.map((row, i) => (
                    <div
                      key={row.team.id}
                      className={cn(
                        "flex items-center gap-3 border-b border-border/50 px-4 py-2.5 text-sm last:border-0",
                        i < 2 && "bg-accent/5",
                      )}
                    >
                      <span
                        className={cn(
                          "w-5 font-mono tabular-nums",
                          i < 2 ? "text-accent" : "text-muted",
                        )}
                      >
                        {i + 1}
                      </span>
                      <Flag team={row.team} size="sm" />
                      <span className="flex-1 truncate font-medium">{row.team.name}</span>
                      {i < 2 && (
                        <span className="rounded bg-accent/10 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-accent">
                          Classificado
                        </span>
                      )}
                      <span className="w-8 text-right font-mono font-semibold tabular-nums">
                        {row.points}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}

function Picker({
  value,
  onChange,
}: {
  value: Outcome | undefined;
  onChange: (o: Outcome) => void;
}) {
  const opts: { key: Outcome; label: string }[] = [
    { key: "home", label: "1" },
    { key: "draw", label: "X" },
    { key: "away", label: "2" },
  ];
  return (
    <div className="flex shrink-0 overflow-hidden rounded-lg border border-border">
      {opts.map((o) => (
        <button
          key={o.key}
          onClick={() => onChange(o.key)}
          className={cn(
            "px-2.5 py-1 font-mono text-xs transition-colors",
            value === o.key
              ? "bg-accent text-white"
              : "text-muted hover:bg-surface-2",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
