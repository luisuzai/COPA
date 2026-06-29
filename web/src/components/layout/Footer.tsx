import Link from "next/link";

import { getProbabilities } from "@/lib/data";
import { SITE_TAGLINE } from "@/lib/site";
import { formatDate } from "@/lib/utils";

const NAV = [
  { href: "/calendar/", label: "Calendário" },
  { href: "/groups/", label: "Chaveamento" },
  { href: "/rankings/title/", label: "Ranking de título" },
  { href: "/compare/", label: "Comparador" },
  { href: "/simulator/", label: "Simulador" },
];

const ABOUT = [
  { href: "/methodology/", label: "Metodologia", external: false },
  {
    href: "https://github.com/luisuzai/COPA",
    label: "Código no GitHub",
    external: true,
  },
  {
    href: "https://www.linkedin.com/in/luisuzai/",
    label: "LinkedIn",
    external: true,
  },
];

/** Footer premium: marca, navegação, autoria e disclaimer responsável. */
export function Footer() {
  const { generatedAt } = getProbabilities();
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
  const linkedinUrl = "https://www.linkedin.com/in/luisuzai/";

  return (
    <footer className="mt-24 border-t border-border/60">
      <div className="container-content py-14">
        <div className="grid gap-10 md:grid-cols-[1.4fr_1fr_1fr]">
          {/* Marca + autoria */}
          <div>
            <p className="font-display text-lg font-bold tracking-tight text-foreground">
              PULSE<span className="text-accent">.</span>
            </p>
            <p className="mt-1 text-sm text-muted">{SITE_TAGLINE}</p>
            <p className="mt-1 font-mono text-xs tabular-nums text-muted">
              Atualizado em {formatDate(generatedAt)}
            </p>

            <a
              href={linkedinUrl}
              target="_blank"
              rel="noreferrer"
              className="group mt-6 inline-flex items-center gap-3"
            >
              <img
                src={`${basePath}/uzai-tinta-a-oleo.webp`}
                alt="Luis Uzai"
                width={40}
                height={40}
                loading="lazy"
                decoding="async"
                className="size-10 rounded-full border border-border object-cover transition group-hover:border-accent"
              />
              <span className="text-xs leading-tight">
                <span className="block text-muted">Criado por</span>
                <span className="font-medium text-foreground transition-colors group-hover:text-accent">
                  Luis Uzai
                </span>
              </span>
            </a>
          </div>

          {/* Navegar */}
          <FooterColumn title="Navegar">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="text-muted transition-colors hover:text-foreground"
              >
                {item.label}
              </Link>
            ))}
          </FooterColumn>

          {/* Sobre */}
          <FooterColumn title="Sobre">
            {ABOUT.map((item) =>
              item.external ? (
                <a
                  key={item.href}
                  href={item.href}
                  target="_blank"
                  rel="noreferrer"
                  className="text-muted transition-colors hover:text-foreground"
                >
                  {item.label} <span aria-hidden>↗</span>
                </a>
              ) : (
                <Link
                  key={item.href}
                  href={item.href}
                  className="text-muted transition-colors hover:text-foreground"
                >
                  {item.label}
                </Link>
              ),
            )}
          </FooterColumn>
        </div>

        {/* Barra inferior */}
        <div className="mt-12 flex flex-col gap-3 border-t border-border/60 pt-6 text-xs text-muted sm:flex-row sm:items-center sm:justify-between">
          <p>© 2026 PULSE · {SITE_TAGLINE}</p>
          <p className="max-w-md sm:text-right">
            Probabilidades por modelo estatístico —{" "}
            <Link href="/methodology/" className="text-foreground hover:text-accent">
              entenda a metodologia
            </Link>
            . Não é aconselhamento de apostas.
          </p>
        </div>
      </div>
    </footer>
  );
}

function FooterColumn({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-wider text-muted/70">{title}</p>
      <nav className="mt-3 flex flex-col gap-2 text-sm">{children}</nav>
    </div>
  );
}
