import { cn } from "@/lib/utils";

type FlagTeam = {
  crest?: string;
  flag?: string;
  code: string;
  name: string;
};

const SIZES = {
  sm: "h-4",
  md: "h-5",
  lg: "h-9",
} as const;

/**
 * Bandeira da seleção como IMAGEM (SVG), não emoji.
 * Emojis de bandeira são inconsistentes entre SO/navegadores (no Windows
 * viram duas letras, e a Inglaterra nem renderiza). A imagem funciona em
 * todo lugar. Fallback: emoji e, por fim, o código de 3 letras.
 */
export function Flag({
  team,
  size = "md",
  className,
}: {
  team: FlagTeam;
  size?: keyof typeof SIZES;
  className?: string;
}) {
  if (team.crest) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={team.crest}
        alt={`Bandeira ${team.name}`}
        loading="lazy"
        className={cn(
          "w-auto rounded-[3px] object-cover ring-1 ring-border/80",
          SIZES[size],
          className,
        )}
      />
    );
  }
  if (team.flag) {
    return <span className={cn("leading-none", className)}>{team.flag}</span>;
  }
  return (
    <span className={cn("font-mono text-xs text-muted", className)}>{team.code}</span>
  );
}
