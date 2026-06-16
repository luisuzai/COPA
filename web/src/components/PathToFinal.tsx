import { Flag } from "@/components/Flag";
import { ProbabilityBar } from "@/components/charts/ProbabilityBar";
import type { PathStep, Team } from "@/lib/types";
import { pct, stageLabel } from "@/lib/utils";

/**
 * Caminho mais provável até a final — trilha vertical premium.
 * Cada etapa: fase, adversário mais provável e chance de avançar.
 * Reutilizado no hub da seleção e na página de cenários.
 */
export function PathToFinal({
  steps,
  teamById,
}: {
  steps: PathStep[];
  teamById: Map<string, Team>;
}) {
  return (
    <ol className="relative space-y-3 border-l border-border pl-6">
      {steps.map((step) => {
        const opp = teamById.get(step.opponentId);
        return (
          <li key={step.stage} className="relative">
            <span className="absolute -left-[1.65rem] top-4 h-2 w-2 rounded-full bg-accent ring-4 ring-bg" />
            <div className="rounded-xl border border-border bg-surface p-4 transition-colors hover:border-accent/40">
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs uppercase tracking-wider text-muted">
                  {stageLabel(step.stage)}
                </span>
                <span className="font-mono text-sm font-semibold tabular-nums text-accent">
                  {pct(step.winProbability)}
                </span>
              </div>
              <div className="mt-2 flex items-center gap-2.5">
                {opp && <Flag team={opp} />}
                <span className="font-medium">{opp?.name ?? "—"}</span>
              </div>
              <ProbabilityBar value={step.winProbability} className="mt-3" />
            </div>
          </li>
        );
      })}
    </ol>
  );
}
