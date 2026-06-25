import { Flag } from "@/components/Flag";
import { ProbabilityBar } from "@/components/charts/ProbabilityBar";
import type { StageOutlook } from "@/lib/scenarios";
import type { Team } from "@/lib/types";
import { pct, stageLabel } from "@/lib/utils";

/**
 * Caminho até a final — trilha vertical premium, com os adversários MAIS
 * PROVÁVEIS de cada fase (não só um). Cada fase mostra a chance de chegar lá,
 * a chance de passar daquela fase e o leque de adversários com a probabilidade
 * de cada um. Alimentado pela simulação Monte Carlo sobre o chaveamento oficial.
 */
export function LikelyPath({
  stages,
  teamById,
}: {
  stages: StageOutlook[];
  teamById: Map<string, Team>;
}) {
  if (stages.length === 0) {
    return (
      <p className="text-sm text-muted">
        Improvável de se classificar ao mata-mata no cenário atual.
      </p>
    );
  }

  return (
    <ol className="relative space-y-3 border-l border-border pl-6">
      {stages.map((step) => (
        <li key={step.stage} className="relative">
          <span className="absolute -left-[1.65rem] top-4 h-2 w-2 rounded-full bg-accent ring-4 ring-bg" />
          <div className="rounded-xl border border-border bg-surface p-4 transition-colors hover:border-accent/40">
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-xs uppercase tracking-wider text-muted">
                {stageLabel(step.stage)}
              </span>
              <span className="font-mono text-xs tabular-nums text-muted">
                chega em <span className="text-foreground">{pct(step.reach)}</span>
                {" · "}passa {pct(step.advance)}
              </span>
            </div>

            <ul className="mt-3 space-y-2.5">
              {step.opponents.map((o) => {
                const opp = teamById.get(o.teamId);
                return (
                  <li key={o.teamId} className="flex items-center gap-2.5">
                    {opp && <Flag team={opp} size="sm" />}
                    <span className="w-28 shrink-0 truncate text-sm font-medium sm:w-36">
                      {opp?.name ?? "—"}
                    </span>
                    <ProbabilityBar value={o.probability} className="flex-1" />
                    <span className="w-9 shrink-0 text-right font-mono text-xs tabular-nums text-muted">
                      {pct(o.probability)}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        </li>
      ))}
    </ol>
  );
}
