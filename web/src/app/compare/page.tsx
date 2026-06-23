"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { Breadcrumb } from "@/components/Breadcrumb";
import { Flag } from "@/components/Flag";
import { SectionHeading } from "@/components/SectionHeading";
import { VersusBar } from "@/components/charts/VersusBar";
import type {
  Match,
  MatchPrediction,
  Predictions,
  Probabilities,
  Team,
  TeamProbabilities,
} from "@/lib/types";
import { cn, oneInPhrase, pct, stageLabel, withBasePath } from "@/lib/utils";

interface Metric {
  label: string;
  a: number;
  b: number;
  /** Narrativa opcional por seleção (ex: "1 a cada 8 Copas"). */
  phrase?: (v: number) => string;
  fmt: (v: number) => string;
}

export default function ComparePage() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [probs, setProbs] = useState<Record<string, TeamProbabilities>>({});
  const [matches, setMatches] = useState<Match[]>([]);
  const [preds, setPreds] = useState<Record<string, MatchPrediction>>({});
  const [aId, setAId] = useState("");
  const [bId, setBId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch(withBasePath("/data/teams.json")).then((r) => r.json()),
      fetch(withBasePath("/data/probabilities.json")).then((r) => r.json()),
      fetch(withBasePath("/data/matches.json")).then((r) => r.json()),
      fetch(withBasePath("/data/predictions.json")).then((r) => r.json()),
    ])
      .then(
        ([t, p, m, pr]: [Team[], Probabilities, Match[], Predictions]) => {
          setTeams([...t].sort((x, y) => x.name.localeCompare(y.name, "pt-BR")));

          const map: Record<string, TeamProbabilities> = {};
          p.teams.forEach((x) => (map[x.teamId] = x));
          setProbs(map);

          setMatches(m);
          const prMap: Record<string, MatchPrediction> = {};
          pr.matches.forEach((x) => (prMap[x.matchSlug] = x));
          setPreds(prMap);

          const byTitle = [...p.teams].sort((x, y) => y.champion - x.champion);
          setAId(byTitle[0]?.teamId ?? t[0]?.id ?? "");
          setBId(byTitle[1]?.teamId ?? t[1]?.id ?? "");
          setLoading(false);
        },
      )
      .catch(() => {
        setError(true);
        setLoading(false);
      });
  }, []);

  const teamById = useMemo(() => new Map(teams.map((t) => [t.id, t])), [teams]);

  /** Posição no ranking de Elo (1 = maior Elo), derivada de teams.json. */
  const ranks = useMemo(() => {
    const byElo = [...teams].sort((a, b) => b.elo - a.elo);
    const map: Record<string, number> = {};
    byElo.forEach((t, i) => (map[t.id] = i + 1));
    return map;
  }, [teams]);

  /** Jogo agendado entre as duas seleções (confronto direto), se houver. */
  const headToHead = useMemo(() => {
    if (!aId || !bId || aId === bId) return undefined;
    const match = matches.find(
      (m) =>
        (m.homeId === aId && m.awayId === bId) ||
        (m.homeId === bId && m.awayId === aId),
    );
    if (!match) return undefined;
    const pred = preds[match.slug];
    if (!pred) return undefined;
    return { match, pred };
  }, [aId, bId, matches, preds]);

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
          <div className="h-32 animate-pulse rounded-2xl bg-surface" />
          <div className="h-32 animate-pulse rounded-2xl bg-surface" />
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
  const sameTeam = aId === bId;

  const metrics: Metric[] = [
    {
      label: "Chance de título",
      a: pa?.champion ?? 0,
      b: pb?.champion ?? 0,
      fmt: (v) => pct(v, 1),
      phrase: (v) => `campeão em ${oneInPhrase(v)} Copas`,
    },
    { label: "Chega à final", a: pa?.final ?? 0, b: pb?.final ?? 0, fmt: (v) => pct(v) },
    { label: "Chega à semifinal", a: pa?.semi ?? 0, b: pb?.semi ?? 0, fmt: (v) => pct(v) },
    { label: "Avança da fase de grupos", a: pa?.advanceGroup ?? 0, b: pb?.advanceGroup ?? 0, fmt: (v) => pct(v) },
    { label: "Rating Elo", a: ta?.elo ?? 0, b: tb?.elo ?? 0, fmt: (v) => String(Math.round(v)) },
  ];

  // Veredito: quem tem a maior chance de título.
  const champA = pa?.champion ?? 0;
  const champB = pb?.champion ?? 0;
  const favoured = champA === champB ? undefined : champA > champB ? ta : tb;
  const favProb = Math.max(champA, champB);
  const underProb = Math.min(champA, champB);

  return (
    <div className="container-content animate-fade-up py-12 sm:py-16">
      <Breadcrumb
        items={[{ label: "Início", href: "/" }, { label: "Comparador" }]}
      />

      <p className="mt-4 text-xs uppercase tracking-eyebrow text-muted">Comparador</p>
      <h1 className="mt-3 font-display text-4xl font-bold tracking-tight sm:text-5xl">
        Duas seleções, lado a lado
      </h1>
      <p className="mt-5 max-w-2xl text-lg text-muted">
        Escolha duas seleções e veja, fase a fase, quem tem a melhor chance de ir longe na
        Copa 2026.
      </p>

      {/* ── Seletores ──────────────────────────────────────── */}
      <div className="mt-10 grid grid-cols-1 items-stretch gap-4 sm:grid-cols-[1fr_auto_1fr]">
        <TeamPicker
          teams={teams}
          value={aId}
          onChange={setAId}
          team={ta}
          rank={ranks[aId]}
          highlight={favoured?.id === aId}
          label="Selecionar a primeira seleção"
        />
        <div className="hidden items-center justify-center sm:flex">
          <span className="font-display text-sm font-bold uppercase tracking-eyebrow text-muted">
            vs
          </span>
        </div>
        <TeamPicker
          teams={teams}
          value={bId}
          onChange={setBId}
          team={tb}
          rank={ranks[bId]}
          highlight={favoured?.id === bId}
          label="Selecionar a segunda seleção"
        />
      </div>

      {/* ── Veredito narrativo ─────────────────────────────── */}
      {!sameTeam && favoured && (
        <p className="mt-6 text-sm text-muted">
          <span className="font-medium text-foreground">{favoured.name}</span> tem a maior
          chance de título —{" "}
          <span className="font-mono tabular-nums text-accent">{pct(favProb, 1)}</span> contra{" "}
          <span className="font-mono tabular-nums">{pct(underProb, 1)}</span>.
        </p>
      )}
      {sameTeam && (
        <p className="mt-6 text-sm text-muted">
          Escolha duas seleções diferentes para ver o confronto.
        </p>
      )}

      {/* ── Lado a lado (cabo de guerra) ───────────────────── */}
      <section className="mt-10">
        <SectionHeading
          eyebrow="Lado a lado"
          title="Quem chega mais longe"
          subtitle="A barra pende para a seleção com maior probabilidade em cada fase."
        />
        <div className="space-y-5 rounded-2xl border border-border bg-surface p-5 sm:p-6">
          {metrics.map((m) => {
            const total = m.a + m.b || 1;
            const aShare = m.a / total;
            const aWins = m.a > m.b;
            const bWins = m.b > m.a;
            return (
              <div key={m.label}>
                <div className="flex items-baseline justify-between gap-3 text-sm">
                  <span
                    className={cn(
                      "font-mono font-semibold tabular-nums",
                      aWins ? "text-accent" : "text-foreground",
                    )}
                  >
                    {m.fmt(m.a)}
                  </span>
                  <span className="text-center text-xs uppercase tracking-wider text-muted">
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
                <div className="mt-2 flex h-2 overflow-hidden rounded-full bg-surface-2">
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
                {m.phrase && (
                  <div className="mt-1.5 flex justify-between text-[11px] leading-tight text-muted">
                    <span>{m.phrase(m.a)}</span>
                    <span>{m.phrase(m.b)}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* ── Confronto direto (se as duas se enfrentam) ─────── */}
      {headToHead && ta && tb && (
        <section className="mt-10">
          <SectionHeading
            eyebrow="Confronto direto"
            title="Quando as duas se encontram"
            subtitle={`Probabilidades do jogo · ${stageLabel(headToHead.match.stage)}`}
          />
          <Link
            href={`/match/${headToHead.match.slug}/`}
            className="block rounded-2xl border border-border bg-surface p-5 transition-colors hover:border-accent/40 sm:p-6"
          >
            <div className="mb-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <Flag team={teamById.get(headToHead.match.homeId)!} />
                <span className="font-medium">
                  {teamById.get(headToHead.match.homeId)?.name}
                </span>
              </div>
              <div className="flex items-center gap-2.5">
                <span className="font-medium">
                  {teamById.get(headToHead.match.awayId)?.name}
                </span>
                <Flag team={teamById.get(headToHead.match.awayId)!} />
              </div>
            </div>
            <VersusBar
              homeWin={headToHead.pred.homeWin}
              draw={headToHead.pred.draw}
              awayWin={headToHead.pred.awayWin}
            />
            <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-accent">
              Ver análise do jogo <span aria-hidden>→</span>
            </span>
          </Link>
        </section>
      )}

      {/* ── Atalhos para as páginas das seleções ───────────── */}
      {!sameTeam && ta && tb && (
        <div className="mt-10 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <TeamLink team={ta} />
          <TeamLink team={tb} />
        </div>
      )}
    </div>
  );
}

function TeamPicker({
  teams,
  value,
  onChange,
  team,
  rank,
  highlight,
  label,
}: {
  teams: Team[];
  value: string;
  onChange: (id: string) => void;
  team?: Team;
  rank?: number;
  highlight?: boolean;
  label: string;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border bg-surface p-5 transition-colors",
        highlight ? "border-accent/50" : "border-border",
      )}
    >
      <div className="flex items-center gap-3">
        {team && <Flag team={team} size="lg" />}
        <div className="min-w-0">
          <p className="truncate font-display text-xl font-bold tracking-tight">
            {team?.name ?? "—"}
          </p>
          {team && (
            <p className="font-mono text-xs tabular-nums text-muted">
              Elo {Math.round(team.elo)}
              {rank ? ` · #${rank} no ranking` : ""}
            </p>
          )}
        </div>
      </div>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label={label}
        className="mt-4 w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm text-foreground outline-none transition-colors hover:border-accent/40 focus-visible:border-accent/60"
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

function TeamLink({ team }: { team: Team }) {
  return (
    <Link
      href={`/team/${team.slug}/`}
      className="flex items-center justify-between gap-3 rounded-xl border border-border bg-surface px-4 py-3 transition-colors hover:border-accent/40"
    >
      <span className="flex items-center gap-2.5">
        <Flag team={team} size="sm" />
        <span className="font-medium">{team.name}</span>
      </span>
      <span className="inline-flex items-center gap-1.5 text-sm text-accent">
        Ver seleção <span aria-hidden>→</span>
      </span>
    </Link>
  );
}
