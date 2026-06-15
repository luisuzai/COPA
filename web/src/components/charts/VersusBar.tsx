import { pct } from "@/lib/utils";

/**
 * Barra tripla de confronto: vitória mandante / empate / vitória visitante.
 * Azul (mandante) · cinza (empate) · cinza claro (visitante). Única viz
 * "composta" do produto — ainda assim minimalista, sem eixos.
 */
export function VersusBar({
  homeWin,
  draw,
  awayWin,
}: {
  homeWin: number;
  draw: number;
  awayWin: number;
}) {
  return (
    <div>
      <div className="flex h-2.5 w-full overflow-hidden rounded-full">
        <div className="bg-accent" style={{ width: `${homeWin * 100}%` }} />
        <div className="bg-surface-2" style={{ width: `${draw * 100}%` }} />
        <div className="bg-muted/40" style={{ width: `${awayWin * 100}%` }} />
      </div>
      <div className="mt-2 flex justify-between font-mono text-xs tabular-nums text-muted">
        <span className="text-accent">{pct(homeWin)}</span>
        <span>empate {pct(draw)}</span>
        <span>{pct(awayWin)}</span>
      </div>
    </div>
  );
}
