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

/** Formata uma data ISO p/ pt-BR curto (ex: "15 jun, 12:00"). */
export function formatDate(iso: string): string {
  try {
    return new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "UTC",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}
