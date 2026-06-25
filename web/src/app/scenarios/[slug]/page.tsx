import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Breadcrumb } from "@/components/Breadcrumb";
import { Flag } from "@/components/Flag";
import { LikelyPath } from "@/components/LikelyPath";
import { Prose } from "@/components/Prose";
import {
  getArticle,
  getOfficialScenarioFor,
  getScenarioSlugs,
  getTeamById,
  getTeamBySlug,
} from "@/lib/data";

export function generateStaticParams() {
  return getScenarioSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const team = getTeamBySlug(slug);
  const article = getArticle("scenario", slug);
  if (!team) return {};
  return {
    title: article?.title ?? `Cenários · ${team.name}`,
    description:
      article?.summary ??
      `Adversários mais prováveis e caminho até a final da seleção ${team.name} na Copa 2026.`,
  };
}

export default async function ScenarioPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const team = getTeamBySlug(slug);
  if (!team) notFound();

  const scenario = getOfficialScenarioFor(team.id);
  const teamById = getTeamById();
  const article = getArticle("scenario", slug);

  return (
    <>
      <section className="container-content animate-fade-up pb-6 pt-12 sm:pt-16">
        <Breadcrumb
          items={[
            { label: "Início", href: "/" },
            { label: team.name, href: `/team/${team.slug}/` },
            { label: "Cenários" },
          ]}
        />
        <div className="mt-4 flex items-center gap-4">
          <Flag team={team} size="lg" />
          <h1 className="font-display text-3xl font-bold tracking-tight sm:text-5xl">
            {team.name}
          </h1>
        </div>
        {scenario && scenario.pathDifficulty > 0 && (
          <p className="mt-3 font-mono text-sm tabular-nums text-muted">
            Dificuldade do caminho · Elo médio dos adversários prováveis{" "}
            {scenario.pathDifficulty}
          </p>
        )}
      </section>

      {/* Adversários mais prováveis em cada fase, no chaveamento oficial */}
      <section className="container-content py-6">
        <h2 className="mb-2 font-display text-lg font-semibold tracking-tight">
          Caminho até a final
        </h2>
        <p className="mb-4 max-w-xl text-sm text-muted">
          Os adversários mais prováveis de cada fase no{" "}
          <span className="text-foreground">chaveamento oficial</span> da Copa 2026,
          com a chance de {team.name} chegar e de passar em cada uma.
        </p>
        <LikelyPath stages={scenario?.stages ?? []} teamById={teamById} />
        <p className="mt-5 max-w-xl text-xs leading-relaxed text-muted">
          O cruzamento de 1º × 2º colocados é o oficial da FIFA. A vaga exata de cada 3º
          colocado é uma aproximação (a FIFA usa uma tabela fixa de combinações) e só
          afeta as quartas em diante.{" "}
          <Link href="/methodology/" className="text-accent hover:text-accent-strong">
            Metodologia →
          </Link>
        </p>
      </section>

      {article?.body && (
        <section className="container-content border-t border-border/50 py-10">
          <h2 className="mb-4 font-display text-lg font-semibold tracking-tight">Análise</h2>
          <Prose markdown={article.body} className="max-w-2xl text-base" />
        </section>
      )}
    </>
  );
}
