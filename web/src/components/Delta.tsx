import { cn } from "@/lib/utils";

/**
 * Variação de um valor (ex: chance de título). Verde p/ alta, vermelho p/
 * baixa — cores semânticas de dados, distintas do azul de marca. Em pontos
 * percentuais (pp) quando `kind` = "pp".
 */
export function Delta({
  value,
  kind = "pp",
  className,
}: {
  value: number;
  kind?: "pp" | "int";
  className?: string;
}) {
  if (!value) {
    return <span className={cn("text-muted", className)}>—</span>;
  }
  const up = value > 0;
  const magnitude =
    kind === "pp" ? (Math.abs(value) * 100).toFixed(1) : String(Math.abs(value));

  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 font-mono text-xs tabular-nums",
        up ? "text-up" : "text-down",
        className,
      )}
    >
      <span aria-hidden>{up ? "▲" : "▼"}</span>
      {magnitude}
      {kind === "pp" ? " pp" : ""}
    </span>
  );
}
