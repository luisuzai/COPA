import { getProbabilities } from "@/lib/data";
import { formatDate } from "@/lib/utils";

/** Footer sóbrio com metadados do modelo e a fronteira IA × estatística. */
export function Footer() {
  const { generatedAt, simulations } = getProbabilities();
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
  const linkedinUrl = "https://www.linkedin.com/in/luisuzai/";

  return (
    <footer className="mt-24 border-t border-border/60">
      <div className="container-content flex flex-col gap-5 py-10 text-xs text-muted sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <a
            href={linkedinUrl}
            target="_blank"
            rel="noreferrer"
            aria-label="LinkedIn de Luis Uzai"
            className="group rounded-full"
          >
            <img
              src={`${basePath}/uzai-tinta-a-oleo.png`}
              alt="Luis Uzai"
              width={48}
              height={48}
              className="size-12 rounded-full border border-border object-cover transition group-hover:border-accent"
            />
          </a>
          <div>
            <p className="font-display text-sm font-semibold text-foreground">
              PULSE<span className="text-accent">.</span>
            </p>
            <p className="mt-1">
              {simulations.toLocaleString("pt-BR")} simulações Monte Carlo · atualizado em{" "}
              {formatDate(generatedAt)}
            </p>
          </div>
        </div>
        <div className="flex flex-col gap-2 sm:items-end">
          <p className="max-w-sm sm:text-right">
            Probabilidades calculadas por modelo estatístico (Elo + Monte Carlo). As
            análises em texto são geradas por IA apenas para explicar os números.
          </p>
          <a
            href={linkedinUrl}
            target="_blank"
            rel="noreferrer"
            className="font-medium text-foreground transition hover:text-accent"
          >
            LinkedIn de Luis Uzai
          </a>
        </div>
      </div>
    </footer>
  );
}
