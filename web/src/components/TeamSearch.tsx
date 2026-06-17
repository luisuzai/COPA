"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { Flag } from "@/components/Flag";
import type { Team } from "@/lib/types";
import { withBasePath } from "@/lib/utils";

/** Remove acentos e baixa caixa p/ busca tolerante ("sao" acha "São"). */
const COMBINING = new RegExp("[\\u0300-\\u036f]", "g");
const fold = (s: string) => s.normalize("NFD").replace(COMBINING, "").toLowerCase();

/**
 * Busca rápida de seleção (Cmd/Ctrl+K). São 48 times — sem isto, achar uma
 * seleção exige passar por Grupos ou Ranking. Carrega teams.json on-demand.
 */
export function TeamSearch() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [teams, setTeams] = useState<Team[]>([]);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Carrega a lista de seleções na 1ª abertura (não no load da página).
  useEffect(() => {
    if (!open || teams.length > 0) return;
    fetch(withBasePath("/data/teams.json"))
      .then((r) => r.json())
      .then((t: Team[]) =>
        setTeams([...t].sort((a, b) => a.name.localeCompare(b.name, "pt-BR"))),
      )
      .catch(() => setTeams([]));
  }, [open, teams.length]);

  // Atalho global Cmd/Ctrl+K p/ abrir; Esc fecha.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      } else if (e.key === "Escape") {
        setOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Foco no input + reset ao abrir; trava o scroll do body.
  useEffect(() => {
    if (open) {
      setQuery("");
      setActive(0);
      document.body.style.overflow = "hidden";
      const id = requestAnimationFrame(() => inputRef.current?.focus());
      return () => {
        cancelAnimationFrame(id);
        document.body.style.overflow = "";
      };
    }
  }, [open]);

  const results = useMemo(() => {
    const q = fold(query.trim());
    const list = q
      ? teams.filter((t) => fold(t.name).includes(q) || fold(t.code).includes(q))
      : teams;
    return list.slice(0, 8);
  }, [teams, query]);

  const go = useCallback(
    (team: Team | undefined) => {
      if (!team) return;
      setOpen(false);
      router.push(`/team/${team.slug}/`);
    },
    [router],
  );

  const onInputKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      go(results[active]);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Buscar seleção"
        className="inline-flex h-9 items-center gap-2 rounded-lg border border-border/70 px-2.5 text-sm text-muted transition-colors hover:border-accent/40 hover:text-foreground"
      >
        <SearchIcon />
        <span className="hidden lg:inline">Buscar seleção</span>
        <kbd className="hidden rounded border border-border/70 px-1 font-mono text-[10px] text-muted lg:inline">
          ⌘K
        </kbd>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[100] flex items-start justify-center bg-bg/70 px-4 pt-[12vh] backdrop-blur-sm"
          onClick={() => setOpen(false)}
          role="presentation"
        >
          <div
            className="w-full max-w-lg overflow-hidden rounded-2xl border border-border bg-surface shadow-2xl"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Buscar seleção"
          >
            <div className="flex items-center gap-3 border-b border-border px-4">
              <SearchIcon className="text-muted" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setActive(0);
                }}
                onKeyDown={onInputKey}
                placeholder="Buscar seleção…"
                className="h-12 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted"
              />
              <kbd className="rounded border border-border px-1.5 py-0.5 font-mono text-[10px] text-muted">
                Esc
              </kbd>
            </div>

            <ul className="max-h-80 overflow-y-auto py-2">
              {results.length === 0 ? (
                <li className="px-4 py-6 text-center text-sm text-muted">
                  {teams.length === 0 ? "Carregando…" : "Nenhuma seleção encontrada."}
                </li>
              ) : (
                results.map((team, i) => (
                  <li key={team.id}>
                    <button
                      type="button"
                      onMouseEnter={() => setActive(i)}
                      onClick={() => go(team)}
                      className={`flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm transition-colors ${
                        i === active ? "bg-surface-2 text-foreground" : "text-muted"
                      }`}
                    >
                      <Flag team={team} size="sm" />
                      <span className="flex-1 font-medium">{team.name}</span>
                      <span className="font-mono text-xs uppercase tracking-wide text-muted">
                        Grupo {team.group.toUpperCase()}
                      </span>
                    </button>
                  </li>
                ))
              )}
            </ul>
          </div>
        </div>
      )}
    </>
  );
}

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      className={className}
      aria-hidden
    >
      <circle cx="11" cy="11" r="7" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}
