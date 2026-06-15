import { cn } from "@/lib/utils";

type FlagTeam = {
  crest?: string;
  flag?: string;
  code: string;
  name: string;
};

const SIZES = {
  sm: "h-4 w-[21.333px]",
  md: "h-5 w-[26.667px]",
  lg: "h-9 w-12",
} as const;

function withBasePath(src: string) {
  if (!src.startsWith("/")) return src;
  return `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}${src}`;
}

function getLocalFlagSrc(src: string) {
  if (!src.startsWith("https://flagcdn.com/")) return withBasePath(src);

  const file = src.split("/").at(-1);
  const slug = file?.replace(/\.[^.]+$/, "");
  return slug ? withBasePath(`/flags/4x3/${slug}.png`) : src;
}

/**
 * Bandeira da selecao como imagem local, nao emoji.
 * Emojis de bandeira sao inconsistentes entre SO/navegadores. As imagens
 * locais evitam falhas por rede e respeitam o basePath do export estatico.
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
        src={getLocalFlagSrc(team.crest)}
        alt={`Bandeira ${team.name}`}
        decoding="async"
        loading="lazy"
        className={cn(
          "inline-block shrink-0 rounded-[3px] bg-surface-2 object-cover ring-1 ring-border/80",
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
