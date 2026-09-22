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
  /** ISO 4217 currency of `price`, when the provider reports it (Yahoo says "GBp" for LSE pence). */
  currency?: string;
  /** Provider's exchange label, when reported (e.g. "NMS", "NZE", "ASX"). */
  exchange?: string;
  /**
   * ISO timestamp of when this quote was fetched and written into the cache.
   * Present on every response (whether served from cache or freshly fetched).
   * Two callers within the same cache window will see the same value.
   */
  cachedAt: string;
}

export interface QuotesResponse {
  quotes: Quote[];
  /** How many seconds the data is intentionally delayed by. */
  delayedSeconds: number;
  /**
   * Upstream data source that produced the quotes.
   * One of "polygon" | "yahoo" | "stooq" | "sample".
   */
  source: string;
  /** How many seconds quote data is held in the shared cache. */
  cacheTtlSeconds: number;
}

/** An anonymous note attached to a (watchlist, symbol). */
export interface Note {
  id: string;
  symbol: string;
  /**
   * The poster's anonymous handle, e.g. "user1234". Falls back to a
   * token-derived label ("anon-6f1ed0") or "agent-cli" when no handle was set.
   */
  author: string;
  source: NoteSource;
  body: string;
  /** ISO timestamp. */
  createdAt: string;
}

/**
 * An anonymous handle: a short, human-friendly name (e.g. "user1234") that a
 * person or agent picks once and reuses so collaborators on a shared watchlist
 * can tell each other apart. Still anonymous — no account, email, or password.
 */
export interface Handle {
  handle: string;
  /** ISO timestamp the handle was first claimed. */
  createdAt: string;
}

/** Result of checking whether a specific handle is still available. */
export interface HandleAvailability {
  handle: string;
  available: boolean;
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
  /**
   * What the caller may do on this list, per the API's optional authorisation
   * hook. Absent on API versions that predate it (treat as fully open).
   */
  access?: WatchlistAccess;
}

export type WatchlistRole = "owner" | "editor" | "commenter" | "viewer" | "anonymous";
export type WatchlistLinkAccess = "public-edit" | "public-comment" | "public-view" | "private";

/** Returned with `GET /api/w/:token` so UIs can grey out controls and explain why. */
export interface WatchlistAccess {
  /** The caller's role on this list; `anonymous` = no membership (link access applies). */
  role: WatchlistRole;
  /** What the bare share link grants to non-members. */
  linkAccess: WatchlistLinkAccess;
  can: { addSymbol: boolean; postNote: boolean; manage: boolean };
  /** The signed-in caller, or null. */
  user: { handle: string } | null;
}

/** One symbol row in the agent aggregate watchlist payload. */
export interface AgentWatchlistStock {
  ticker: string;
  comments: Note[];
}

/** Aggregate watchlist + note threads for AI agents (single request). */
export interface AgentWatchlistResponse {
  watchlist: Watchlist;
  stocks: AgentWatchlistStock[];
  /** Present when the watchlist has more symbols than the applied limit. */
  truncated?: boolean;
  totalSymbols?: number;
  symbolLimit?: number;
}

export interface CreateNoteInput {
  symbol: string;
  body: string;
  source: NoteSource;
  /** The poster's anonymous handle, e.g. "user1234". Optional. */
  handle?: string;
}

/**
 * A row in the symbols catalog (one listing on one exchange). `ticker` is
 * the canonical symbol (`AAPL`, `FPH.NZ`, `0700.HK`) — the string to store
 * on watchlists and notes. See markets.ts for the suffix ↔ exchange table.
 */
export interface SymbolEntry {
  ticker: string;
  /** Short exchange code for badges: "NASDAQ", "NYSE", "NZX", "ASX", … */
  exchange: string;
  /** ISO 10383 MIC of the listing venue ("XXXX" when not known). */
  mic: string;
  /** ISO 4217 trading currency. */
  currency: string;
  /** ISO 3166-1 alpha-2 country of the exchange. */
  country: string;
  title: string;
  /** ISIN when the source publishes one. */
  isin: string | null;
  /** SEC Central Index Key — US listings only. */
  cikStr: number | null;
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
  /** Exchange filter that was applied, if any. */
  exchange?: string;
}

/** Why the authorisation hook refused a request (401 → sign in, 403 → insufficient role). */
export type AccessDeniedReason = "sign_in_required" | "forbidden";

/** Body of a 401/403 produced by the authorisation hook (see docs/authz-contract.md). */
export interface AccessDeniedBody {
  error: string;
  reason: AccessDeniedReason;
  /** Where to sign in, when the API is configured with DASHBOARD_URL. */
  signInUrl?: string;
}

/** GET /api/whoami */
export interface WhoamiResponse {
  /** The signed-in caller, or null when anonymous / no authorisation hook. */
  user: { handle: string } | null;
  /**
   * The caller's most recently saved watchlist, when the hosted service tracks
   * them for this account. Null when anonymous, when there is no hook, or when
   * the account has saved none yet. Optional so older APIs still typecheck.
   */
  lastWatchlist?: { token: string; name: string | null } | null;
}
