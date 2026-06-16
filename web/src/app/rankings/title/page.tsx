import type { Metadata } from "next";

import { FavoritesTable } from "@/components/FavoritesTable";
import { getFavorites, getLeader, getProbabilities } from "@/lib/data";
import { oneInPhrase } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Ranking de título",
  description:
    "As 48 seleções da Copa do Mundo 2026 ordenadas por chance de título, " +
    "segundo 100.000 simulações Monte Carlo.",
};

export default function TitleRankingPage() {
  const favorites = getFavorites();
  const leader = getLeader();
  const { simulations } = getProbabilities();

  return (
    <div className="container-content py-12 sm:py-16">
      <p className="text-xs uppercase tracking-eyebrow text-muted">Ranking</p>
      <h1 className="mt-4 font-display text-4xl font-bold tracking-tight sm:text-5xl">
        Quem vai ser campeão?
      </h1>
      <p className="mt-5 max-w-2xl text-lg text-muted">
        As 48 seleções por chance de título, segundo{" "}
        {simulations.toLocaleString("pt-BR")} simulações.{" "}
        {leader && (
          <>
            {leader.team.name} lidera — campeã em {oneInPhrase(leader.champion)} Copas
            simuladas.
          </>
        )}
      </p>

      <div className="mt-10">
        <FavoritesTable rows={favorites} />
      </div>
    </div>
  );
}
