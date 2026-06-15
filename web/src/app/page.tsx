import type { Metadata } from "next";

import { FavoritesTable } from "@/components/FavoritesTable";
import { Prose } from "@/components/Prose";
import { Delta } from "@/components/Delta";
import { getArticle, getFavorites, getMovers, getProbabilities } from "@/lib/data";
import { pct } from "@/lib/utils";

export function generateMetadata(): Metadata {
  const article = getArticle("home", "home");
  return {
    title: article?.title ?? "Análises da Copa do Mundo 2026",
    description: article?.summary,
  };
}

export default function HomePage() {
  const favorites = getFavorites();
  const movers = getMovers(3);
  const article = getArticle("home", "home");
  const { simulations } = getProbabilities();

  return (
    <>
      {/* ── Hero editorial ─────────────────────────────────── */}
      <section className="container-content pb-12 pt-16 sm:pt-24">
        <p className="animate-fade-up text-xs uppercase tracking-eyebrow text-muted">
          Copa do Mundo 2026
        </p>
        <h1 className="animate-fade-up delay-1 mt-4 max-w-3xl font-display text-4xl font-bold leading-[1.05] tracking-tight sm:text-6xl">
          {article?.title ?? "As probabilidades da Copa, em tempo real"}
        </h1>
        {article?.summary && (
          <p className="animate-fade-up delay-2 mt-5 max-w-xl text-lg text-muted">
            {article.summary}
          </p>
        )}
      </section>

      {/* ── Favoritos ──────────────────────────────────────── */}
      <section id="favoritos" className="container-content py-10">
        <SectionHeading
          title="Favoritos ao título"
          subtitle={`Chance de ser campeão · ${simulations.toLocaleString("pt-BR")} simulações`}
        />
        <div className="animate-fade-up">
          <FavoritesTable rows={favorites} />
        </div>
      </section>

      {/* ── O que mudou ────────────────────────────────────── */}
      {movers.length > 0 && (
        <section className="container-content py-10">
          <SectionHeading title="O que mudou na última rodada" />
          <div className="grid gap-4 sm:grid-cols-3">
            {movers.map((m) => (
              <div
                key={m.team.id}
                className="rounded-xl border border-border bg-surface p-5 transition-all hover:-translate-y-0.5 hover:border-accent/40"
              >
                <div className="flex items-center gap-2.5">
                  <span className="text-xl leading-none">{m.team.flag}</span>
                  <span className="font-medium">{m.team.name}</span>
                </div>
                <div className="mt-3 flex items-baseline gap-2">
                  <span className="font-mono text-2xl font-semibold tabular-nums">
                    {pct(m.champion)}
                  </span>
                  <Delta value={m.championChange} />
                </div>
                <p className="mt-1 text-xs text-muted">chance de título</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Análise (texto da IA, renderizado no HTML p/ SEO) ─ */}
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
