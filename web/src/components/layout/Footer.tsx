import { getProbabilities } from "@/lib/data";
import { formatDate } from "@/lib/utils";

/** Footer sóbrio com metadados do modelo e a fronteira IA × estatística. */
export function Footer() {
  const { generatedAt, simulations } = getProbabilities();

  return (
    <footer className="mt-24 border-t border-border/60">
      <div className="container-content flex flex-col gap-4 py-10 text-xs text-muted sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-display text-sm font-semibold text-foreground">
            COPA<span className="text-accent">.</span>
          </p>
          <p className="mt-1">
            {simulations.toLocaleString("pt-BR")} simulações Monte Carlo · atualizado em{" "}
            {formatDate(generatedAt)}
          </p>
        </div>
        <p className="max-w-sm sm:text-right">
          Probabilidades calculadas por modelo estatístico (Elo + Monte Carlo). As
          análises em texto são geradas por IA apenas para explicar os números.
        </p>
      </div>
    </footer>
  );
}
