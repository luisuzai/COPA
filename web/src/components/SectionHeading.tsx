import Link from "next/link";

import { cn } from "@/lib/utils";

/**
 * Cabeçalho de seção editorial — fonte única de ritmo tipográfico do site.
 *
 * - `eyebrow`: rótulo curto em accent acima do título (dá hierarquia e cor).
 * - `variant="featured"`: título maior (destaque) vs. `default` (denso).
 * - `action`: link/elemento alinhado à direita (ex: "Ver tudo →"), evita
 *   links soltos pendurados abaixo das listas.
 */
export function SectionHeading({
  eyebrow,
  title,
  subtitle,
  action,
  variant = "default",
  as = "h2",
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  variant?: "default" | "featured";
  as?: "h1" | "h2";
}) {
  const featured = variant === "featured";
  const Title = as;
  return (
    <div className="mb-6 flex items-end justify-between gap-4">
      <div className="min-w-0">
        {eyebrow && (
          <p className="text-[11px] font-medium uppercase tracking-eyebrow text-accent">
            {eyebrow}
          </p>
        )}
        <Title
          className={cn(
            "font-display tracking-tight",
            eyebrow && "mt-2",
            featured ? "text-2xl font-bold sm:text-3xl" : "text-lg font-semibold",
          )}
        >
          {title}
        </Title>
        {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
      </div>
      {action && <div className="shrink-0 pb-1">{action}</div>}
    </div>
  );
}

/** Link compacto p/ a área de `action` de um SectionHeading. */
export function HeadingLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="whitespace-nowrap text-sm text-accent transition-colors hover:text-accent-strong"
    >
      {children}
    </Link>
  );
}
