import type { SymbolEntry } from "@teemtape/api-client";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { useApi } from "../context/ApiContext";

export function SymbolSearch({
  onSelect,
  placeholder = "Search symbol or name…",
}: {
  onSelect: (entry: SymbolEntry) => void;
  placeholder?: string;
}) {
  const client = useApi();
  const listId = useId();
  const wrapRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SymbolEntry[]>([]);
  const [open, setOpen] = useState(false);
  const [searching, setSearching] = useState(false);

  const runSearch = useCallback(
    async (q: string) => {
      const trimmed = q.trim();
      if (trimmed.length < 1) {
        setResults([]);
        return;
      }
      setSearching(true);
      try {
        const res = await client.listSymbols({ q: trimmed, limit: 8 });
        setResults(res.symbols);
        setOpen(true);
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    },
    [client],
  );

  useEffect(() => {
    const handle = window.setTimeout(() => {
      void runSearch(query);
    }, 250);
    return () => window.clearTimeout(handle);
  }, [query, runSearch]);

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const pick = (entry: SymbolEntry) => {
    onSelect(entry);
    setQuery("");
    setResults([]);
    setOpen(false);
  };

  return (
    <div className="search-wrap" ref={wrapRef}>
      <input
        type="search"
        className="search-input"
        placeholder={placeholder}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => {
          if (results.length > 0) setOpen(true);
        }}
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
      />
      {open && results.length > 0 && (
        <ul className="search-results" id={listId} role="listbox">
          {results.map((entry) => (
            <li key={entry.ticker} role="option">
              <button type="button" onClick={() => pick(entry)}>
                <span className="ticker">{entry.ticker}</span>
                <span className="muted">{entry.title}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {searching && query.trim() && (
        <span className="sr-only" aria-live="polite">
          Searching…
        </span>
      )}
    </div>
  );
}
