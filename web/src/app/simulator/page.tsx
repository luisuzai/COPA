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

/** Hash determinístico de string → [0,1). Mesmo jogo, mesmo número sempre. */
function hash01(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 100000) / 100000;
}

/**
 * Resultado-base de um jogo: SORTEADO pela distribuição do modelo
 * (vitória/empate/derrota), não o argmax. Assim o cenário inicial tem empates
 * e zebras na proporção real — e é determinístico (estável a cada carregamento).
 */
function sampledOutcome(p: MatchPrediction): Outcome {
  const r = hash01(p.matchSlug);
  if (r < p.homeWin) return "home";
  if (r < p.homeWin + p.draw) return "draw";
  return "away";
}

export default function SimulatorPage() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [picks, setPicks] = useState<Record<string, Outcome>>({});
  const [defaults, setDefaults] = useState<Record<string, Outcome>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

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
            def[mm.slug] = pr ? sampledOutcome(pr) : "draw";
          }
        }
        setTeams(t); setMatches(m); setDefaults(def); setPicks(def);
        setLoading(false);
      })
      .catch(() => { setError(true); setLoading(false); });
  }, []);

  const teamById = useMemo(() => new Map(teams.map((t) => [t.id, t])), [teams]);
  const groups = useMemo(
    () => [...new Set(teams.map((t) => t.group))].sort(),
    [teams],
  );
  const counts = useMemo(() => {
    let home = 0, draw = 0, away = 0;
    for (const v of Object.values(picks)) {
      if (v === "home") home++;
      else if (v === "draw") draw++;
      else if (v === "away") away++;
    }
    return { home, draw, away, total: home + draw + away };
  }, [picks]);

  if (error) {
    return (
      <div className="container-content py-24 text-center">
        <p className="text-muted">Não foi possível carregar os dados do simulador.</p>
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
      <div className="container-content py-12" aria-busy="true">
        <div className="h-3 w-24 animate-pulse rounded bg-surface-2" />
        <div className="mt-4 h-10 w-2/3 max-w-lg animate-pulse rounded bg-surface-2" />
        <div className="mt-4 h-4 w-full max-w-xl animate-pulse rounded bg-surface-2" />
        <div className="mt-10 grid gap-6 lg:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-48 animate-pulse rounded-xl bg-surface" />
          ))}
        </div>
        <span className="sr-only">Carregando simulador…</span>
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
        O cenário inicial é sorteado pelas probabilidades do modelo — por isso há{" "}
        <span className="text-foreground">empates</span> e zebras, como numa Copa de
        verdade. Clique na bandeira de quem vence (ou em{" "}
        <span className="text-foreground">Empate</span>) para mudar e ver a
        classificação reagir. Tudo recalculado no seu navegador.
      </p>

      <div className="mt-5 flex flex-wrap items-center gap-4">
        <button
          onClick={() => setPicks(defaults)}
          className="rounded-lg border border-border px-3 py-1.5 text-sm text-muted transition-colors hover:bg-surface-2 hover:text-foreground"
        >
          Restaurar cenário do modelo
        </button>
        {counts.total > 0 && (
          <p className="font-mono text-xs tabular-nums text-muted">
            {counts.total} jogos restantes · {counts.home} mandante ·{" "}
            <span className="text-foreground">{counts.draw} empates</span> ·{" "}
            {counts.away} visitante
          </p>
        )}
      </div>

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
                        className="flex items-center gap-3 rounded-xl border border-border bg-surface px-3 py-2.5"
                      >
                        <span className="flex-1 truncate text-right text-sm">{home.name}</span>
                        <Picker
                          value={picks[m.slug]}
                          home={home}
                          away={away}
                          onChange={(o) => setPicks((prev) => ({ ...prev, [m.slug]: o }))}
                        />
                        <span className="flex-1 truncate text-sm">{away.name}</span>
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
  home,
  away,
  onChange,
}: {
  value: Outcome | undefined;
  home: Team;
  away: Team;
  onChange: (o: Outcome) => void;
}) {
  const base =
    "flex h-8 items-center justify-center rounded-md border transition-colors";
  return (
    <div className="flex shrink-0 items-center gap-1">
      <button
        type="button"
        title={`${home.name} vence`}
        aria-label={`${home.name} vence`}
        onClick={() => onChange("home")}
        className={cn(
          base,
          "w-9",
          value === "home" ? "border-accent bg-accent/15" : "border-border hover:bg-surface-2",
        )}
      >
        <Flag team={home} size="sm" />
      </button>
      <button
        type="button"
        title="Empate"
        onClick={() => onChange("draw")}
        className={cn(
          base,
          "px-2 text-xs font-medium",
          value === "draw"
            ? "border-accent bg-accent/15 text-accent"
            : "border-border text-muted hover:bg-surface-2",
        )}
      >
        Empate
      </button>
      <button
        type="button"
        title={`${away.name} vence`}
        aria-label={`${away.name} vence`}
        onClick={() => onChange("away")}
        className={cn(
          base,
          "w-9",
          value === "away" ? "border-accent bg-accent/15" : "border-border hover:bg-surface-2",
        )}
      >
        <Flag team={away} size="sm" />
      </button>
    </div>
  );
}
