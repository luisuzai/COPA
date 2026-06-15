import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";

import "./globals.css";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { JsonLd } from "@/components/JsonLd";
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "@/lib/site";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "COPA — Análises da Copa do Mundo 2026",
    template: "%s · COPA",
  },
  description:
    "Probabilidades, simulações Monte Carlo e análises da Copa do Mundo 2026. " +
    "Quem tem mais chance de ser campeão, o caminho até a final e os cenários mais prováveis.",
  applicationName: "COPA",
  openGraph: {
    type: "website",
    locale: "pt_BR",
    siteName: "COPA",
    title: "COPA — Análises da Copa do Mundo 2026",
    description:
      "Probabilidades e simulações da Copa do Mundo 2026, com análises em linguagem natural.",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body className="min-h-dvh">
        <JsonLd
          data={{
            "@context": "https://schema.org",
            "@type": "WebSite",
            name: SITE_NAME,
            url: SITE_URL,
            description: SITE_DESCRIPTION,
            inLanguage: "pt-BR",
          }}
        />
        <Header />
        <main>{children}</main>
        <Footer />
      </body>
    </html>
  );
}
