import Link from "next/link";

export interface Crumb {
  label: string;
  href?: string;
}

/** Trilha de navegação leve para páginas internas (Início › Grupos › …). */
export function Breadcrumb({ items }: { items: Crumb[] }) {
  return (
    <nav
      aria-label="Trilha de navegação"
      className="flex flex-wrap items-center gap-1.5 text-xs tracking-wide text-muted"
    >
      {items.map((item, i) => (
        <span key={`${item.label}-${i}`} className="flex items-center gap-1.5">
          {i > 0 && (
            <span aria-hidden className="text-muted/40">
              /
            </span>
          )}
          {item.href ? (
            <Link
              href={item.href}
              className="transition-colors hover:text-foreground"
            >
              {item.label}
            </Link>
          ) : (
            <span className="text-foreground/80" aria-current="page">
              {item.label}
            </span>
          )}
        </span>
      ))}
    </nav>
  );
}
