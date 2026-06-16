import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Combina classes Tailwind resolvendo conflitos (padrão shadcn). */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/** Fração (0.182) → "18%". `digits` controla casas decimais. */
export function pct(value: number, digits = 0): string {
  return `${(value * 100).toFixed(digits)}%`;
}

/** Prefixo de base (vazio em dev, '/COPA' em produção) p/ fetch no cliente. */
export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

/** Monta um caminho absoluto respeitando o basePath do GitHub Pages. */
export function withBasePath(path: string): string {
  return `${BASE_PATH}${path}`;
}

/** Rótulo em pt-BR de uma fase do torneio. */
export function stageLabel(stage: string): string {
  const labels: Record<string, string> = {
    group: "Fase de grupos",
    round_of_32: "16-avos de final", // 32 seleções = 16-avos (não "32 avos")
    round_of_16: "Oitavas de final",
    quarter: "Quartas de final",
    semi: "Semifinal",
    third_place: "Disputa de 3º lugar",
    final: "Final",
  };
  return labels[stage] ?? stage;
}

/**
 * Narrativa em vez de número cru. Ex: 0.124 → "1 a cada 8".
 * O coração do PULSE: transformar probabilidade em história.
 */
export function oneInPhrase(p: number): string {
  if (p <= 0) return "praticamente impossível";
  if (p >= 0.95) return "quase certo";
  const n = Math.round(1 / p);
  return `1 a cada ${n}`;
}

/** Ex: 0.4 → "4 em cada 10"; 0.03 → "3 em cada 100". Bom p/ "chega à semi em...". */
export function sharePhrase(p: number): string {
  if (p <= 0) return "0 em cada 10";
  if (p >= 0.1) return `${Math.round(p * 10)} em cada 10`;
  if (p >= 0.01) return `${Math.round(p * 100)} em cada 100`;
  return "menos de 1 em cada 100";
}

/** Data ISO → "15 jun" (curto, sem hora). */
export function formatDay(iso: string): string {
  try {
    return new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "short",
      timeZone: "UTC",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

/** Formata uma data ISO p/ pt-BR curto no horário de Brasília (ex: "15 jun, 16:00"). */
export function formatDate(iso: string): string {
  try {
    return new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "America/Sao_Paulo",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}
