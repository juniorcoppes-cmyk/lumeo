"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { SearchIcon } from "@/components/icons";

type Result = { id: string; name: string; profile_type: string; avatarUrl?: string };

export function ComunidadeSearch({ initialQuery }: { initialQuery: string }) {
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<Result[]>([]);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setResults([]);
      setOpen(false);
      return;
    }

    const timeout = setTimeout(async () => {
      try {
        const res = await fetch(`/api/comunidade/search?q=${encodeURIComponent(trimmed)}`);
        const data = await res.json();
        setResults(data.results ?? []);
        setOpen(true);
      } catch {
        setResults([]);
      }
    }, 300);

    return () => clearTimeout(timeout);
  }, [query]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className="relative">
      <label className="flex flex-col gap-1 sm:col-span-2">
        <span className="text-xs text-muted">Buscar por nome</span>
        <div className="relative">
          <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <input
            type="text"
            name="q"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => results.length > 0 && setOpen(true)}
            placeholder="Digite parte do nome"
            autoComplete="off"
            className="input w-full pl-9"
          />
        </div>
      </label>

      {open && (
        <ul className="card absolute z-10 mt-1 max-h-72 w-full overflow-y-auto !p-1">
          {results.map((p) => (
            <li key={p.id}>
              <Link
                href={`/perfil/${p.id}`}
                className="flex items-center gap-2 rounded-xl px-2 py-2 no-underline hover:bg-accent-soft"
              >
                {p.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.avatarUrl} alt="" className="h-8 w-8 rounded-full object-cover" />
                ) : (
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-accent-soft text-[9px] text-muted">
                    —
                  </div>
                )}
                <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
                  {p.name}
                </span>
                <span className="shrink-0 text-xs text-muted">{p.profile_type}</span>
              </Link>
            </li>
          ))}
          {results.length === 0 && (
            <li className="px-2 py-2 text-sm text-muted">Nenhum perfil encontrado.</li>
          )}
        </ul>
      )}
    </div>
  );
}
