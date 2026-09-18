import { ApiError, type Quote, type SymbolEntry, type WatchlistAccess } from "@teemtape/api-client";
import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Footer } from "../components/Footer";
import { NotePopup } from "../components/NotePopup";
import { PrivateWatchlist } from "../components/PrivateWatchlist";
import { ShareBar } from "../components/ShareBar";
import { SymbolSearch } from "../components/SymbolSearch";
import { TopBar } from "../components/TopBar";
import { WatchlistTable } from "../components/WatchlistTable";
import { getDashboardUrl } from "../config";
import { useApiForToken } from "../context/ApiContext";
import { deniedActionMessage, describeAccess } from "../lib/access";

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
  const [denied, setDenied] = useState<ApiError | null>(null);
  const [access, setAccess] = useState<WatchlistAccess | undefined>(undefined);
  const [noteSymbol, setNoteSymbol] = useState<string | null>(null);
  const [addingSymbol, setAddingSymbol] = useState(false);
  const [creatingLink, setCreatingLink] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    setDenied(null);
    try {
      const watchlist = await client.getWatchlist();
      setSymbols(watchlist.symbols);
      setAccess(watchlist.access);

      if (watchlist.symbols.length === 0) {
        setQuotes([]);
        setNoteCounts({});
        return;
      }

      const quotesRes = await client.getQuotes(watchlist.symbols);
      setQuotes(quotesRes.quotes);
      setNoteCounts(await fetchNoteCounts(client, watchlist.symbols));
    } catch (err) {
      if (err instanceof ApiError && err.accessDenied) {
        setDenied(err);
        return;
      }
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
      if (err instanceof ApiError && err.accessDenied) {
        // Our view of the permissions was stale; say so and re-read them.
        setError(deniedActionMessage("add_symbol", Boolean(access?.user)));
        void refresh();
        return;
      }
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

  const copy = describeAccess(access, getDashboardUrl());
  const signInUrl = getDashboardUrl();

  return (
    <div className="app">
      <TopBar
        onAddSymbol={focusSearch}
        addingSymbol={addingSymbol}
        addSymbolBlocked={loading ? undefined : copy.addSymbol}
      />

      {denied ? (
        <PrivateWatchlist error={denied} />
      ) : (
        <ShareBar
          token={token}
          onNewLink={() => void createNewLink()}
          creatingLink={creatingLink}
          linkHint={copy.linkHint}
          badge={copy.badge}
        />
      )}

      {loading && <div className="status-banner loading">Loading watchlist…</div>}
      {!loading && error && <div className="status-banner error">{error}</div>}
      {!loading && !denied && copy.summary && (
        <div className="status-banner access" role="status">
          <span className="lock" aria-hidden="true">🔒</span> {copy.summary}
          {copy.offerSignIn && signInUrl && (
            <>
              {" "}
              <a href={signInUrl}>Sign in</a> if you've been invited.
            </>
          )}
        </div>
      )}

      {!denied && (
        <div className="toolbar">
          <h2 style={{ fontSize: 16 }}>Watchlist</h2>
          {loading || !copy.addSymbol ? (
            <SymbolSearch onSelect={(entry) => void addSymbol(entry)} />
          ) : (
            <span className="faint access-reason" title={copy.addSymbol}>
              Adding symbols is off for you here.
            </span>
          )}
        </div>
      )}

      {!loading && !error && !denied && (
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
          postBlocked={copy.postNote}
          offerSignIn={copy.offerSignIn ? signInUrl : undefined}
          signedIn={Boolean(access?.user)}
          onAccessChanged={() => void refresh()}
        />
      )}
    </div>
  );
}
