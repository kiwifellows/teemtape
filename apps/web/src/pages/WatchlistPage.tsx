import type { Quote, SymbolEntry } from "@teemtape/api-client";
import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Footer } from "../components/Footer";
import { NotePopup } from "../components/NotePopup";
import { ShareBar } from "../components/ShareBar";
import { SymbolSearch } from "../components/SymbolSearch";
import { TopBar } from "../components/TopBar";
import { WatchlistTable } from "../components/WatchlistTable";
import { useApiForToken } from "../context/ApiContext";

async function fetchNoteCounts(
  client: ReturnType<typeof useApiForToken>,
  symbols: string[],
): Promise<Record<string, number>> {
  const entries = await Promise.all(
    symbols.map(async (symbol) => {
      try {
        const res = await client.getNotes(symbol);
        return [symbol, res.notes.length] as const;
      } catch {
        return [symbol, 0] as const;
      }
    }),
  );
  return Object.fromEntries(entries);
}

export function WatchlistPage({ token }: { token: string }) {
  const client = useApiForToken(token);
  const navigate = useNavigate();

  const [symbols, setSymbols] = useState<string[]>([]);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [noteCounts, setNoteCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [noteSymbol, setNoteSymbol] = useState<string | null>(null);
  const [addingSymbol, setAddingSymbol] = useState(false);
  const [creatingLink, setCreatingLink] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const watchlist = await client.getWatchlist();
      setSymbols(watchlist.symbols);

      if (watchlist.symbols.length === 0) {
        setQuotes([]);
        setNoteCounts({});
        return;
      }

      const quotesRes = await client.getQuotes(watchlist.symbols);
      setQuotes(quotesRes.quotes);
      setNoteCounts(await fetchNoteCounts(client, watchlist.symbols));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load watchlist");
    } finally {
      setLoading(false);
    }
  }, [client]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const addSymbol = async (entry: SymbolEntry) => {
    if (symbols.includes(entry.ticker)) return;
    setAddingSymbol(true);
    setError(null);
    try {
      const watchlist = await client.addSymbol(entry.ticker);
      setSymbols(watchlist.symbols);
      const quotesRes = await client.getQuotes(watchlist.symbols);
      setQuotes(quotesRes.quotes);
      setNoteCounts((prev) => ({ ...prev, [entry.ticker]: prev[entry.ticker] ?? 0 }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add symbol");
    } finally {
      setAddingSymbol(false);
    }
  };

  const focusSearch = () => {
    document.querySelector<HTMLInputElement>(".search-input")?.focus();
  };

  const createNewLink = async () => {
    setCreatingLink(true);
    setError(null);
    try {
      const watchlist = await client.createWatchlist();
      void navigate(`/w/${watchlist.token}`, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create watchlist");
      setCreatingLink(false);
    }
  };

  const refreshNoteCount = async (symbol: string) => {
    try {
      const res = await client.getNotes(symbol);
      setNoteCounts((prev) => ({ ...prev, [symbol]: res.notes.length }));
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="app">
      <TopBar onAddSymbol={focusSearch} addingSymbol={addingSymbol} />

      <ShareBar token={token} onNewLink={() => void createNewLink()} creatingLink={creatingLink} />

      {loading && <div className="status-banner loading">Loading watchlist…</div>}
      {!loading && error && <div className="status-banner error">{error}</div>}

      <div className="toolbar">
        <h2 style={{ fontSize: 16 }}>Watchlist</h2>
        <SymbolSearch onSelect={(entry) => void addSymbol(entry)} />
      </div>

      {!loading && !error && (
        <WatchlistTable
          quotes={quotes}
          noteCounts={noteCounts}
          onOpenNotes={setNoteSymbol}
        />
      )}

      <Footer />

      {noteSymbol && (
        <NotePopup
          token={token}
          symbol={noteSymbol}
          onClose={() => setNoteSymbol(null)}
          onNotePosted={() => void refreshNoteCount(noteSymbol)}
        />
      )}
    </div>
  );
}
