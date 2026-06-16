import type { MetadataRoute } from "next";

import { getGroups, getMatches, getScenarioSlugs, getTeams } from "@/lib/data";
import { SITE_URL } from "@/lib/site";

// Sitemap estático gerado no build (SSG). Lista todas as páginas indexáveis.
export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const paths = [
    "/",
    "/simulator/",
    "/methodology/",
    "/rankings/title/",
    ...getTeams().map((t) => `/team/${t.slug}/`),
    ...getMatches().map((m) => `/match/${m.slug}/`),
    ...getGroups().map((g) => `/group/${g}/`),
    ...getScenarioSlugs().map((s) => `/scenarios/${s}/`),
  ];

  return paths.map((path) => ({
    url: `${SITE_URL}${path}`,
    lastModified: now,
  }));
}
