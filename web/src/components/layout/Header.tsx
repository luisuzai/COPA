import Link from "next/link";

const NAV = [
  { href: "/#favoritos", label: "Favoritos" },
  { href: "/rankings/title/", label: "Ranking" },
  { href: "/simulator/", label: "Simulador" },
  { href: "/methodology/", label: "Metodologia" },
];

/** Header editorial PULSE: minimalista, fixo no topo, com blur sutil. */
export function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-border/60 bg-bg/70 backdrop-blur-xl">
      <div className="container-content flex h-14 items-center justify-between">
        <Link
          href="/"
          className="font-display text-sm font-bold tracking-tight text-foreground"
        >
          PULSE<span className="text-accent">.</span>
        </Link>
        <nav className="flex items-center gap-5 text-sm sm:gap-6">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-muted transition-colors hover:text-foreground"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
