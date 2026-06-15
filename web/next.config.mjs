/**
 * Next.js — export estático para GitHub Pages.
 *
 * - output: 'export'  → gera HTML estático em /out (SSG puro, sem servidor).
 * - basePath/assetPrefix '/COPA' em produção → o site é servido em
 *   usuario.github.io/COPA, então CSS, JS e links precisam desse prefixo.
 *   Em dev (localhost:3000) o prefixo é vazio.
 * - images.unoptimized → o otimizador de imagens do Next exige servidor;
 *   no export estático precisa ser desligado.
 * - trailingSlash → o GitHub Pages serve melhor /team/brazil/ (com pasta).
 */
const isProd = process.env.NODE_ENV === "production";
const repo = "/COPA";

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "export",
  basePath: isProd ? repo : "",
  assetPrefix: isProd ? repo : "",
  trailingSlash: true,
  images: { unoptimized: true },
  // Exposto ao cliente p/ o simulador montar URLs de fetch dos JSON.
  env: { NEXT_PUBLIC_BASE_PATH: isProd ? repo : "" },
};

export default nextConfig;
