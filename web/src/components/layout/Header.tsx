"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

import { cn } from "@/lib/utils";

const NAV = [
  { href: "/calendar/", label: "Calendário" },
  { href: "/groups/", label: "Grupos" },
  { href: "/rankings/title/", label: "Ranking" },
  { href: "/compare/", label: "Comparador" },
  { href: "/simulator/", label: "Simulador" },
  { href: "/methodology/", label: "Metodologia" },
];

/** Normaliza barras das pontas p/ comparar pathname (com trailingSlash) e href. */
const norm = (s: string) => "/" + s.replace(/^\/+|\/+$/g, "");

/** Header editorial PULSE: nav completa no desktop, drawer no mobile. */
export function Header() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const isActive = (href: string) => norm(pathname) === norm(href);

  return (
    <header className="sticky top-0 z-50 border-b border-border/60 bg-bg/70 backdrop-blur-xl">
      <div className="container-content flex h-14 items-center justify-between">
        <Link
          href="/"
          onClick={() => setOpen(false)}
          className="font-display text-sm font-bold tracking-tight text-foreground"
        >
          PULSE<span className="text-accent">.</span>
        </Link>

        {/* Desktop */}
        <nav className="hidden items-center gap-5 text-sm md:flex lg:gap-6">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "transition-colors hover:text-foreground",
                isActive(item.href)
                  ? "font-medium text-foreground"
                  : "text-muted",
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        {/* Mobile: botão hambúrguer */}
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-controls="mobile-nav"
          aria-label={open ? "Fechar menu" : "Abrir menu"}
          className="-mr-2 inline-flex size-9 items-center justify-center rounded-md text-muted transition-colors hover:text-foreground md:hidden"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            aria-hidden
          >
            {open ? (
              <>
                <line x1="6" y1="6" x2="18" y2="18" />
                <line x1="18" y1="6" x2="6" y2="18" />
              </>
            ) : (
              <>
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </>
            )}
          </svg>
        </button>
      </div>

      {/* Mobile: painel */}
      {open && (
        <nav
          id="mobile-nav"
          className="container-content flex flex-col gap-1 border-t border-border/60 py-3 text-sm md:hidden"
        >
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className={cn(
                "rounded-md px-2 py-2.5 transition-colors hover:bg-border/30 hover:text-foreground",
                isActive(item.href)
                  ? "font-medium text-foreground"
                  : "text-muted",
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
}
