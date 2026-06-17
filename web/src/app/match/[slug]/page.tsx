import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { Flag } from "@/components/Flag";
import { JsonLd } from "@/components/JsonLd";
import { Prose } from "@/components/Prose";
import { VersusBar } from "@/components/charts/VersusBar";
import {
  getMatchArticle,
  getMatchBySlug,
  getMatches,
  getPredictionForMatch,
  getRankFor,
  getTeamById,
} from "@/lib/data";
import { formatDate, pct, stageLabel } from "@/lib/utils";
import type { Team } from "@/lib/types";

export function generateStaticParams() {
  return getMatches().map((m) => ({ slug: m.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const match = getMatchBySlug(slug);
  const article = getMatchArticle(slug);
  if (!match) return {};
  const teamById = getTeamById();
  const home = teamById.get(match.homeId)?.name ?? "";
  const away = teamById.get(match.awayId)?.name ?? "";
  return {
    title: article?.title ?? `${home} x ${away}`,
    description: article?.summary ?? `Probabilidades e análise de ${home} x ${away}.`,
  };
}

export default async function MatchPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const match = getMatchBySlug(slug);
  if (!match) notFound();

  const teamById = getTeamById();
  const home = teamById.get(match.homeId);
  const away = teamById.get(match.awayId);
  if (!home || !away) notFound();

  const pred = getPredictionForMatch(slug);
  const article = getMatchArticle(slug);
  const finished = match.status === "finished";

  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "SportsEvent",
          name: `${home.name} x ${away.name}`,
          sport: "Football",
          startDate: match.kickoff,
          ...(match.venue ? { location: { "@type": "Place", name: match.venue } } : {}),
          competitor: [
            { "@type": "SportsTeam", name: home.name },
            { "@type": "SportsTeam", name: away.name },
          ],
        }}
      />

      <section className="container-content animate-fade-up pb-6 pt-12 sm:pt-16">
        <p className="text-center text-xs uppercase tracking-eyebrow text-muted">
          {stageLabel(match.stage)}
          {match.group ? ` · Grupo ${match.group.toUpperCase()}` : ""} ·{" "}
          {formatDate(match.kickoff)}
        </p>

        {/* Versus header simétrico */}
        <div className="mt-8 grid grid-cols-[1fr_auto_1fr] items-center gap-4 sm:gap-8">
          <TeamSide team={home} align="right" />
          <div className="text-center">
            {finished ? (
              <p className="font-mono text-3xl font-bold tabular-nums sm:text-5xl">
                {match.homeScore}
                <span className="mx-2 text-muted">·</span>
                {match.awayScore}
              </p>
            ) : (
              <p className="font-display text-2xl font-semibold text-muted">×</p>
            )}
          </div>
          <TeamSide team={away} align="left" />
        </div>
      </section>

      {/* Probabilidades (jogos não finalizados) */}
      {pred && (
        <section className="container-content py-6">
          <div className="mx-auto max-w-xl rounded-xl border border-border bg-surface p-5">
            <VersusBar homeWin={pred.homeWin} draw={pred.draw} awayWin={pred.awayWin} />
          </div>
        </section>
      )}

      {/* Comparação estatística */}
      <section className="container-content py-6">
        <div className="mx-auto max-w-xl divide-y divide-border/60 rounded-xl border border-border bg-surface">
          <CompareRow
            label="Elo"
            home={String(Math.round(home.elo))}
            away={String(Math.round(away.elo))}
          />
          <CompareRow
            label="Ranking"
            home={getRankFor(home.id) ? `#${getRankFor(home.id)}` : "—"}
            away={getRankFor(away.id) ? `#${getRankFor(away.id)}` : "—"}
          />
          {pred && (
            <CompareRow
              label="Placar provável"
              home={String(Math.round(pred.expectedHomeGoals))}
              away={String(Math.round(pred.expectedAwayGoals))}
            />
          )}
        </div>
      </section>

      {article?.body && (
        <section className="container-content border-t border-border/50 py-10">
          <h2 className="mb-4 font-display text-lg font-semibold tracking-tight">
            {finished ? "Pós-jogo" : "Análise"}
          </h2>
          <Prose markdown={article.body} className="mx-auto max-w-2xl text-base" />
        </section>
      )}
    </>
  );
}

function TeamSide({ team, align }: { team: Team; align: "left" | "right" }) {
  return (
    <a
      href={`/team/${team.slug}/`}
      className={`flex flex-col items-center gap-3 ${
        align === "right" ? "sm:items-end" : "sm:items-start"
      }`}
    >
      <Flag team={team} size="lg" />
      <span className="text-center font-display text-lg font-semibold tracking-tight sm:text-xl">
        {team.name}
      </span>
    </a>
  );
}

function CompareRow({
  label,
  home,
  away,
}: {
  label: string;
  home: string;
  away: string;
}) {
  return (
    <div className="grid grid-cols-3 items-center px-5 py-3 text-sm">
      <span className="text-left font-mono font-semibold tabular-nums">{home}</span>
      <span className="text-center text-xs uppercase tracking-wider text-muted">{label}</span>
      <span className="text-right font-mono font-semibold tabular-nums">{away}</span>
    </div>
  );
}
