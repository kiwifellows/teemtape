/**
 * Shared data contracts for the teemtape API.
 *
 * These types are the single source of truth used by every client (CLI, web,
 * and later React Native) and will be implemented by the Cloudflare Worker in
 * milestone M0. See docs/architecture.md and docs/roadmap.md.
 */

/** Where a note came from. Drives the "agent" badge in the web UI. */
export type NoteSource = "web" | "cli";

/** A delayed stock quote (delayed ~1 minute on purpose — not a trading tool). */
export interface Quote {
  symbol: string;
  name: string;
  /** Last (delayed) price. */
  price: number;
  /** Absolute change vs previous close. */
  change: number;
  /** Percentage change vs previous close. */
  pct: number;
  /** ISO timestamp of the (delayed) quote. */
  asOf: string;
}

export interface QuotesResponse {
  quotes: Quote[];
  /** How many seconds the data is intentionally delayed by. */
  delayedSeconds: number;
  /** Upstream data source, e.g. "polygon" | "massive" | "mock". */
  source: string;
}

/** An anonymous note attached to a (watchlist, symbol). */
export interface Note {
  id: string;
  symbol: string;
  /** Short anonymous handle, e.g. "anon-6f1ed0" or "agent-cli". */
  author: string;
  source: NoteSource;
  body: string;
  /** ISO timestamp. */
  createdAt: string;
}

export interface NotesResponse {
  symbol: string;
  notes: Note[];
}

/** A watchlist identified by an anonymous MD5 token (lives in the share URL). */
export interface Watchlist {
  token: string;
  symbols: string[];
  createdAt: string;
}

export interface CreateNoteInput {
  symbol: string;
  body: string;
  source: NoteSource;
}

/** A row in the SEC symbols reference catalog. */
export interface SymbolEntry {
  ticker: string;
  cikStr: number;
  title: string;
}

export interface SymbolsListResponse {
  symbols: SymbolEntry[];
  /** Zero-based row offset (e.g. 0, 100, 200). */
  offset: number;
  /** Page size (max 100). */
  limit: number;
  /** Total rows matching the current filters. */
  total: number;
  /** Sort order applied: ticker or title. */
  sort: "ticker" | "title";
}
