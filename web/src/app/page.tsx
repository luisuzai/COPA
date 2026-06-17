import type { Metadata } from "next";
import Link from "next/link";

import { FavoritesTable } from "@/components/FavoritesTable";
import { Flag } from "@/components/Flag";
import { Prose } from "@/components/Prose";
import { ResultsFeed } from "@/components/ResultsFeed";
import { RoundInsights } from "@/components/RoundInsights";
import { UpcomingMatches } from "@/components/UpcomingMatches";
import {
  getArticle,
  getFavorites,
  getLeader,
  getProbabilities,
  getRecentResults,
  getRoundInsights,
  getUpcomingMatches,
} from "@/lib/data";
import { formatDay, oneInPhrase, pct } from "@/lib/utils";

export function generateMetadata(): Metadata {
  const article = getArticle("home", "home");
  return {
    title: article?.title ?? "A história da Copa do Mundo 2026",
    description: article?.summary,
  };
}

export default function HomePage() {
  const leader = getLeader();
  const favorites = getFavorites();
  const insights = getRoundInsights();
  const results = getRecentResults(4);
  const upcoming = getUpcomingMatches(6);
  const article = getArticle("home", "home");
  const { generatedAt } = getProbabilities();

  return (
    <>
      {/* ── Hero editorial: a história da rodada ────────────── */}
      <section className="container-content pb-8 pt-14 sm:pt-20">
        <p className="animate-fade-up text-xs uppercase tracking-eyebrow text-muted">
          Inteligência da Copa · atualizado em {formatDay(generatedAt)}
        </p>
        <h1 className="animate-fade-up delay-1 mt-4 max-w-4xl font-display text-4xl font-bold leading-[1.05] tracking-tight sm:text-6xl">
          {article?.title ?? "Quem vai levantar a taça?"}
        </h1>
        {article?.summary && (
          <p className="animate-fade-up delay-2 mt-5 max-w-2xl text-lg text-muted">
            {article.summary}
          </p>
        )}
      </section>

      {/* ── História principal: o líder ────────────────────── */}
      {leader && (
        <section className="container-content pb-12">
          <Link
            href={`/team/${leader.team.slug}/`}
            className="animate-fade-up group block overflow-hidden rounded-2xl border border-border bg-surface p-6 transition-colors hover:border-accent/40 sm:p-8"
          >
            <div className="flex flex-col gap-8 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <div className="flex items-center gap-3">
                  <Flag team={leader.team} size="lg" />
                  <span className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
                    {leader.team.name}
                  </span>
                  <span className="rounded-full border border-accent/30 bg-accent/10 px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide text-accent">
                    Líder
                  </span>
                </div>
                <p className="mt-6 text-xs uppercase tracking-wider text-muted">
                  Chance de conquistar a Copa
                </p>
                <p className="font-mono text-6xl font-bold leading-none tabular-nums text-accent sm:text-7xl">
                  {pct(leader.champion, 1)}
                </p>
                <p className="mt-3 max-w-md text-muted">
                  Conquista o título em aproximadamente{" "}
                  <span className="text-foreground">
                    {oneInPhrase(leader.champion)}
                  </span>{" "}
                  Copas — o atual favorito ao caneco.
                </p>
              </div>
              <span className="inline-flex shrink-0 items-center gap-2 self-start rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-white transition-colors group-hover:bg-accent-strong sm:self-auto">
                Ver análise completa
                <span aria-hidden>→</span>
              </span>
            </div>
          </Link>
        </section>
      )}

      {/* ── Últimos resultados (o que aconteceu) ───────────── */}
      {results.length > 0 && (
        <section className="container-content py-10">
          <SectionHeading
            title="Últimos resultados"
            subtitle="O que aconteceu na rodada e o que mudou"
          />
          <ResultsFeed results={results} />
        </section>
      )}

      {/* ── Próximos jogos (dashboard) ─────────────────────── */}
      {upcoming.length > 0 && (
        <section className="container-content py-10">
          <SectionHeading
            title="Próximos jogos"
            subtitle="A expectativa de resultado de cada partida · horário de Brasília"
          />
          <UpcomingMatches matches={upcoming} />
        </section>
      )}

      {/* ── Insights da Rodada ─────────────────────────────── */}
      {insights.length > 0 && (
        <section className="container-content py-10">
          <SectionHeading
            title="Insights da Rodada"
            subtitle="O que mudou e por quê, gerado automaticamente"
          />
          <RoundInsights insights={insights} />
        </section>
      )}

      {/* ── Favoritos ──────────────────────────────────────── */}
      <section id="favoritos" className="container-content py-10">
        <SectionHeading
          title="Favoritos ao título"
          subtitle="Probabilidade de cada seleção levantar a taça"
        />
        <FavoritesTable rows={favorites.slice(0, 12)} />
        <Link
          href="/rankings/title/"
          className="mt-4 inline-block text-sm text-accent transition-colors hover:text-accent-strong"
        >
          Ver ranking completo das 48 seleções →
        </Link>
      </section>

      {/* ── Análise (texto da IA, no HTML p/ SEO) ──────────── */}
      {article?.body && (
        <section className="container-content border-t border-border/50 py-12">
          <SectionHeading title="Análise" />
          <Prose markdown={article.body} className="max-w-2xl text-base" />
        </section>
      )}
    </>
  );
}

function SectionHeading({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-5">
      <h2 className="font-display text-lg font-semibold tracking-tight">{title}</h2>
      {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
    </div>
  );
}
