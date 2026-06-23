import type { Metadata } from "next";
import Link from "next/link";

import { FavoritesTable } from "@/components/FavoritesTable";
import { Flag } from "@/components/Flag";
import { Prose } from "@/components/Prose";
import { ResultsFeed } from "@/components/ResultsFeed";
import { RoundInsights } from "@/components/RoundInsights";
import { HeadingLink, SectionHeading } from "@/components/SectionHeading";
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
      {/* ── Matéria principal: manchete + líder como "stat" ──
          Uma única unidade editorial. A manchete é o herói; o líder é o
          número que a sustenta — não um segundo herói competindo. */}
      <section className="container-content pb-12 pt-14 sm:pt-20">
        <div className="grid gap-10 lg:grid-cols-[1.6fr_1fr] lg:items-center lg:gap-14">
          <div>
            <p className="animate-fade-up text-xs uppercase tracking-eyebrow text-muted">
              Inteligência da Copa · atualizado em {formatDay(generatedAt)}
            </p>
            <h1 className="animate-fade-up delay-1 mt-4 max-w-3xl font-display text-4xl font-bold leading-[1.05] tracking-tight sm:text-5xl">
              {article?.title ?? "Quem vai levantar a taça?"}
            </h1>
            {article?.summary && (
              <p className="animate-fade-up delay-2 mt-5 max-w-xl text-lg text-muted">
                {article.summary}
              </p>
            )}
          </div>

          {/* Líder: o número que sustenta a manchete */}
          {leader && (
            <Link
              href={`/team/${leader.team.slug}/`}
              className="animate-fade-up delay-2 group block overflow-hidden rounded-2xl border border-border bg-surface p-6 transition-colors hover:border-accent/40 sm:p-7"
            >
              <div className="flex items-center gap-2.5">
                <Flag team={leader.team} size="lg" />
                <div className="min-w-0">
                  <p className="text-[11px] font-medium uppercase tracking-wider text-accent">
                    Favorito ao título
                  </p>
                  <p className="truncate font-display text-lg font-bold tracking-tight">
                    {leader.team.name}
                  </p>
                </div>
              </div>
              <p className="mt-6 text-xs uppercase tracking-wider text-muted">
                Chance de conquistar a Copa
              </p>
              <p className="font-mono text-6xl font-bold leading-none tracking-tighter tabular-nums text-accent">
                {pct(leader.champion, 1)}
              </p>
              <p className="mt-3 text-sm text-muted">
                Campeão em{" "}
                <span className="text-foreground">{oneInPhrase(leader.champion)}</span>{" "}
                Copas
              </p>
              <span className="mt-6 inline-flex items-center gap-1.5 text-sm font-medium text-accent transition-colors group-hover:text-accent-strong">
                Ver análise da seleção <span aria-hidden>→</span>
              </span>
            </Link>
          )}
        </div>
      </section>

      {/* ── A leitura da rodada (texto da IA, no HTML p/ SEO) ──
          Editorial-first: a história vem logo após a manchete; os dados
          (favoritos, resultados…) a sustentam abaixo. */}
      {article?.body && (
        <section
          id="analise"
          className="container-content scroll-mt-20 border-t border-border/60 py-14"
        >
          <SectionHeading
            variant="featured"
            eyebrow="Análise"
            title="A leitura da rodada"
          />
          <Prose markdown={article.body} className="max-w-2xl text-base" />
        </section>
      )}

      {/* ── Favoritos (herói funcional, em destaque) ───────── */}
      <section id="favoritos" className="container-content border-t border-border/60 py-14">
        <SectionHeading
          variant="featured"
          eyebrow="Quem vai ganhar"
          title="Favoritos ao título"
          subtitle="Probabilidade de cada seleção levantar a taça"
          action={
            <HeadingLink href="/rankings/title/">Ranking das 48 →</HeadingLink>
          }
        />
        <FavoritesTable rows={favorites.slice(0, 12)} />
      </section>

      {/* ── Últimos resultados (o que aconteceu) ───────────── */}
      {results.length > 0 && (
        <section className="container-content py-12">
          <SectionHeading
            eyebrow="O que aconteceu"
            title="Últimos resultados"
            subtitle="Placar e o impacto de cada jogo nas chances"
          />
          <ResultsFeed results={results} />
        </section>
      )}

      {/* ── Próximos jogos (dashboard) ─────────────────────── */}
      {upcoming.length > 0 && (
        <section className="container-content py-12">
          <SectionHeading
            eyebrow="O que vem aí"
            title="Próximos jogos"
            subtitle="A expectativa de cada partida · horário de Brasília"
            action={<HeadingLink href="/calendar/">Calendário completo →</HeadingLink>}
          />
          <UpcomingMatches matches={upcoming} />
        </section>
      )}

      {/* ── Insights da Rodada ─────────────────────────────── */}
      {insights.length > 0 && (
        <section className="container-content py-12">
          <SectionHeading
            eyebrow="Por trás dos números"
            title="Insights da Rodada"
            subtitle="O que mudou e por quê, gerado automaticamente"
          />
          <RoundInsights insights={insights} />
        </section>
      )}
    </>
  );
}
