import Link from "next/link";

const NAV = [
  { href: "/#favoritos", label: "Favoritos" },
  { href: "/scenarios/brazil/", label: "Cenários" },
  { href: "/simulator/", label: "Simulador" },
];

/** Header editorial: minimalista, fixo no topo, com blur sutil. */
export function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-border/60 bg-bg/70 backdrop-blur-xl">
      <div className="container-content flex h-14 items-center justify-between">
        <Link
          href="/"
          className="font-display text-sm font-bold tracking-tight text-foreground"
        >
          COPA<span className="text-accent">.</span>
        </Link>
        <nav className="flex items-center gap-6 text-sm">
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
