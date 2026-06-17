import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { Breadcrumb } from "@/components/Breadcrumb";
import { Flag } from "@/components/Flag";
import { Prose } from "@/components/Prose";
import { ProbabilityBar } from "@/components/charts/ProbabilityBar";
import {
  getArticle,
  getScenarioFor,
  getScenarioSlugs,
  getTeamById,
  getTeamBySlug,
} from "@/lib/data";
import { pct, stageLabel } from "@/lib/utils";

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
      `Adversários mais prováveis e caminho até a final da seleção ${team.name}.`,
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

  const scenario = getScenarioFor(team.id);
  if (!scenario) notFound();

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
        <p className="mt-3 font-mono text-sm tabular-nums text-muted">
          Dificuldade do caminho · Elo médio dos adversários {scenario.pathDifficulty}
        </p>
      </section>

      {/* Caminho mais provável até a final */}
      {scenario.likeliestPath.length > 0 && (
        <section className="container-content py-6">
          <h2 className="mb-4 font-display text-lg font-semibold tracking-tight">
            Caminho mais provável até a final
          </h2>
          <ol className="relative space-y-3 border-l border-border pl-6">
            {scenario.likeliestPath.map((step) => {
              const opp = teamById.get(step.opponentId);
              return (
                <li key={step.stage} className="relative">
                  <span className="absolute -left-[1.6rem] top-3 h-2 w-2 rounded-full bg-accent" />
                  <div className="rounded-xl border border-border bg-surface p-4">
                    <p className="text-xs uppercase tracking-wider text-muted">
                      {stageLabel(step.stage)}
                    </p>
                    <div className="mt-2 flex items-center justify-between gap-3">
                      <span className="flex items-center gap-2.5">
                        {opp && <Flag team={opp} />}
                        <span className="font-medium">{opp?.name ?? "—"}</span>
                      </span>
                      <span className="font-mono text-sm font-semibold tabular-nums text-accent">
                        {pct(step.winProbability)}
                      </span>
                    </div>
                    <ProbabilityBar value={step.winProbability} className="mt-3" />
                  </div>
                </li>
              );
            })}
          </ol>
        </section>
      )}

      {/* Adversários mais prováveis */}
      {scenario.likelyOpponents.length > 0 && (
        <section className="container-content py-6">
          <h2 className="mb-3 font-display text-lg font-semibold tracking-tight">
            Adversários mais prováveis
          </h2>
          <div className="divide-y divide-border/60 rounded-2xl border border-border bg-surface">
            {scenario.likelyOpponents.map((o) => {
              const opp = teamById.get(o.teamId);
              return (
                <div
                  key={o.stage}
                  className="flex items-center justify-between px-4 py-3 text-sm"
                >
                  <span className="text-xs uppercase tracking-wider text-muted">
                    {stageLabel(o.stage)}
                  </span>
                  <span className="flex flex-1 items-center justify-center gap-2.5">
                    {opp && <Flag team={opp} size="sm" />}
                    <span className="font-medium">{opp?.name ?? "—"}</span>
                  </span>
                  <span className="font-mono text-sm tabular-nums text-muted">
                    {pct(o.probability)}
                  </span>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {article?.body && (
        <section className="container-content border-t border-border/50 py-10">
          <h2 className="mb-4 font-display text-lg font-semibold tracking-tight">Análise</h2>
          <Prose markdown={article.body} className="max-w-2xl text-base" />
        </section>
      )}
    </>
  );
}
