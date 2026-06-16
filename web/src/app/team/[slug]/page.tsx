import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Flag } from "@/components/Flag";
import { JsonLd } from "@/components/JsonLd";
import { PathToFinal } from "@/components/PathToFinal";
import { Prose } from "@/components/Prose";
import { Sparkline } from "@/components/charts/Sparkline";
import { StatCard } from "@/components/StatCard";
import {
  getArticle,
  getHistory,
  getNextMatchForTeam,
  getPredictionForMatch,
  getProbabilitiesFor,
  getRankFor,
  getScenarioFor,
  getTeamById,
  getTeamBySlug,
  getTeams,
} from "@/lib/data";
import { formatDate, formatDay, oneInPhrase, pct, sharePhrase } from "@/lib/utils";

export function generateStaticParams() {
  return getTeams().map((t) => ({ slug: t.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const team = getTeamBySlug(slug);
  const article = getArticle("team", slug);
  if (!team) return {};
  return {
    title: article?.title ?? team.name,
    description:
      article?.summary ??
      `Probabilidades, ranking de Elo e caminho até a final da seleção ${team.name} na Copa 2026.`,
  };
}

export default async function TeamPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const team = getTeamBySlug(slug);
  if (!team) notFound();

  const prob = getProbabilitiesFor(team.id);
  const rank = getRankFor(team.id);
  const article = getArticle("team", slug);
  const scenario = getScenarioFor(team.id);
  const history = getHistory(team.id);
  const teamById = getTeamById();

  const nextMatch = getNextMatchForTeam(team.id);
  const nextPred = nextMatch ? getPredictionForMatch(nextMatch.slug) : undefined;
  const opponent = nextMatch
    ? teamById.get(nextMatch.homeId === team.id ? nextMatch.awayId : nextMatch.homeId)
    : undefined;
  const winProb = nextPred
    ? nextMatch!.homeId === team.id
      ? nextPred.homeWin
      : nextPred.awayWin
    : undefined;

  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "SportsTeam",
          name: team.name,
          sport: "Football",
          ...(team.crest ? { logo: team.crest } : {}),
        }}
      />

      {/* ── Cabeçalho ──────────────────────────────────────── */}
      <section className="container-content animate-fade-up pb-8 pt-12 sm:pt-16">
        <Link
          href={`/group/${team.group}/`}
          className="text-xs uppercase tracking-eyebrow text-muted transition-colors hover:text-foreground"
        >
          Grupo {team.group.toUpperCase()}
        </Link>
        <div className="mt-4 flex items-center gap-4">
          <Flag team={team} size="lg" />
          <h1 className="font-display text-4xl font-bold tracking-tight sm:text-5xl">
            {team.name}
          </h1>
        </div>
        <p className="mt-3 font-mono text-sm tabular-nums text-muted">
          Elo {Math.round(team.elo)} · {rank ? `#${rank} no ranking` : "—"}
        </p>
      </section>

      {/* ── Probabilidades com narrativa ───────────────────── */}
      {prob && (
        <section className="container-content py-6">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatCard
              label="Classificação"
              value={pct(prob.advanceGroup)}
              bar={prob.advanceGroup}
              note={`avança em ${sharePhrase(prob.advanceGroup)}`}
            />
            <StatCard
              label="Semifinal"
              value={pct(prob.semi)}
              bar={prob.semi}
              note={`chega em ${sharePhrase(prob.semi)}`}
            />
            <StatCard
              label="Final"
              value={pct(prob.final)}
              bar={prob.final}
              note={`chega em ${sharePhrase(prob.final)}`}
            />
            <StatCard
              label="Título"
              value={pct(prob.champion)}
              bar={prob.champion}
              note={`campeão em ${oneInPhrase(prob.champion)} Copas`}
              accent
            />
          </div>
        </section>
      )}

      {/* ── Evolução (histórico) ───────────────────────────── */}
      {history.length >= 2 && (
        <section className="container-content py-6">
          <h2 className="mb-3 font-display text-lg font-semibold tracking-tight">
            Evolução da chance de título
          </h2>
          <div className="rounded-xl border border-border bg-surface p-5">
            <Sparkline points={history} />
            <div className="mt-2 flex justify-between font-mono text-xs tabular-nums text-muted">
              <span>
                {formatDay(history[0].date)} · {pct(history[0].value, 1)}
              </span>
              <span className="text-accent">
                {formatDay(history[history.length - 1].date)} ·{" "}
                {pct(history[history.length - 1].value, 1)}
              </span>
            </div>
          </div>
        </section>
      )}

      {/* ── Caminho até a final ────────────────────────────── */}
      {scenario && scenario.likeliestPath.length > 0 && (
        <section className="container-content py-6">
          <h2 className="mb-1 font-display text-lg font-semibold tracking-tight">
            Caminho até a final
          </h2>
          <p className="mb-4 text-sm text-muted">
            Adversário mais provável e chance de avançar em cada fase.
          </p>
          <PathToFinal steps={scenario.likeliestPath} teamById={teamById} />
        </section>
      )}

      {/* ── Próximo jogo ───────────────────────────────────── */}
      {nextMatch && opponent && (
        <section className="container-content py-6">
          <h2 className="mb-3 font-display text-lg font-semibold tracking-tight">
            Próximo jogo
          </h2>
          <Link
            href={`/match/${nextMatch.slug}/`}
            className="flex items-center justify-between rounded-xl border border-border bg-surface p-4 transition-colors hover:bg-surface-2"
          >
            <div className="flex items-center gap-3">
              <Flag team={opponent} />
              <div>
                <p className="font-medium">{opponent.name}</p>
                <p className="text-xs text-muted">{formatDate(nextMatch.kickoff)}</p>
              </div>
            </div>
            {winProb !== undefined && (
              <div className="text-right">
                <p className="font-mono text-lg font-semibold tabular-nums text-accent">
                  {pct(winProb)}
                </p>
                <p className="text-xs text-muted">vitória</p>
              </div>
            )}
          </Link>
        </section>
      )}

      {/* ── Análise da IA ──────────────────────────────────── */}
      {article?.body && (
        <section className="container-content border-t border-border/50 py-10">
          <h2 className="mb-4 font-display text-lg font-semibold tracking-tight">Análise</h2>
          <Prose markdown={article.body} className="max-w-2xl text-base" />
          <Link
            href={`/scenarios/${team.slug}/`}
            className="mt-6 inline-block text-sm text-accent transition-colors hover:text-accent-strong"
          >
            Ver todos os cenários e adversários prováveis →
          </Link>
        </section>
      )}
    </>
  );
}
