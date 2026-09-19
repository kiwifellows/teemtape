import { findMarket, marketForSuffix, splitSymbol, type SymbolEntry, type SymbolsListResponse } from "@teemtape/api-client";
import type { Env } from "./env.js";
import type { SymbolsListParams } from "./symbols.js";

/**
 * In-memory symbols catalog, loaded from the `teemtape.catalog.v1` snapshot
 * that the sync workflow writes to KV after each import
 * (packages/symbols-sync/src/catalog.ts is the producer and documents the
 * shape). Searching D1 with `LIKE '%q%'` reads the whole table twice per
 * keystroke; a linear scan of ~15k rows in memory costs well under a
 * millisecond and no billable operation at all.
 *
 * The snapshot is ~1 MB of JSON and takes ~6 ms to parse, so it is parsed
 * once per isolate and kept for CATALOG_REFRESH_SECONDS; after that the
 * next request re-reads KV in the background (stale-while-revalidate) and
 * keeps serving the copy it has. The catalog changes fortnightly, so an hour
 * of staleness is fine.
 */

export const CATALOG_KV_KEY = "symbols:catalog:v1";
const CATALOG_SCHEMA = "teemtape.catalog.v1";
const DEFAULT_REFRESH_SECONDS = 3600;

/** One snapshot row: ticker, exchange, mic, title, isin, cikStr. */
type SnapshotRow = [string, string, string, string, string | null, number | null];

interface Snapshot {
  schema: string;
  generatedAt: string;
  count: number;
  rows: SnapshotRow[];
}

/** A listing plus the bits derived once from its ticker at load time. */
interface Listing {
  entry: SymbolEntry;
  base: string;
  suffix: string;
}

interface Catalog {
  generatedAt: string;
  /** Sorted by ticker (the snapshot's order). */
  byTicker: Listing[];
  /** Same listings ordered by title, built on first use (~5 ms for 15k rows). */
  byTitle?: Listing[];
}

interface CacheState {
  catalog: Catalog | undefined;
  loadedAt: number;
  refreshing?: Promise<Catalog | undefined>;
}

// Module scope: lives as long as the isolate, shared by every request in it.
const state: CacheState = { catalog: undefined, loadedAt: 0 };

function refreshSeconds(env: Env): number {
  const n = Number(env.SYMBOLS_CATALOG_REFRESH_SECONDS ?? DEFAULT_REFRESH_SECONDS);
  return Number.isFinite(n) && n >= 0 ? n : DEFAULT_REFRESH_SECONDS;
}

function toListing(row: SnapshotRow): Listing {
  const [ticker, exchange, mic, title, isin, cikStr] = row;
  const { base, suffix, market } = splitSymbol(ticker);
  const home = market ?? marketForSuffix("");
  return {
    entry: { ticker, exchange, mic, currency: home?.currency ?? "USD", country: home?.country ?? "US", title, isin, cikStr },
    base,
    suffix,
  };
}

async function readSnapshot(env: Env): Promise<Catalog | undefined> {
  const snapshot = await env.QUOTES_CACHE.get<Snapshot>(CATALOG_KV_KEY, "json");
  if (!snapshot || snapshot.schema !== CATALOG_SCHEMA || !Array.isArray(snapshot.rows)) return undefined;
  return { generatedAt: snapshot.generatedAt, byTicker: snapshot.rows.map(toListing) };
}

/**
 * The catalog, or undefined when no snapshot has been published yet (the
 * caller then falls back to D1). Only one KV read is in flight at a time.
 */
export async function loadCatalog(env: Env, ctx: ExecutionContext): Promise<Catalog | undefined> {
  const maxAge = refreshSeconds(env) * 1000;
  const fresh = state.catalog && Date.now() - state.loadedAt < maxAge;
  if (fresh) return state.catalog;

  if (!state.refreshing) {
    state.refreshing = readSnapshot(env)
      .then((catalog) => {
        // Keep a good catalog if the key vanished mid-flight; a missing key
        // on first load simply means "not published yet".
        if (catalog || !state.catalog) state.catalog = catalog;
        state.loadedAt = Date.now();
        return state.catalog;
      })
      .catch((err: unknown) => {
        console.warn("symbols: catalog refresh failed, keeping the current copy:", err);
        state.loadedAt = Date.now();
        return state.catalog;
      })
      .finally(() => {
        state.refreshing = undefined;
      });
  }

  // Serve the stale copy now and let the refresh finish after the response.
  if (state.catalog) {
    ctx.waitUntil(state.refreshing);
    return state.catalog;
  }
  return state.refreshing;
}

/** Drop the in-memory copy (tests). */
export function resetCatalogCache(): void {
  state.catalog = undefined;
  state.loadedAt = 0;
}

function contains(term: string): RegExp {
  return new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
}

/**
 * Same semantics as the D1 query in symbols.ts: case-insensitive substring
 * matches, an exact exchange-local code sorts first so a bare "AMP" shows
 * both the NYSE and the ASX listing, then ticker or title order.
 */
export function searchCatalog(catalog: Catalog, params: SymbolsListParams): SymbolsListResponse {
  const filters: Array<(l: Listing) => boolean> = [];
  if (params.q) {
    const re = contains(params.q);
    filters.push((l) => re.test(l.entry.ticker) || re.test(l.entry.title));
  }
  if (params.symbol) {
    const re = contains(params.symbol);
    filters.push((l) => re.test(l.entry.ticker));
  }
  if (params.name) {
    const re = contains(params.name);
    filters.push((l) => re.test(l.entry.title));
  }
  if (params.exchange) {
    const suffix = findMarket(params.exchange)?.suffix ?? params.exchange;
    filters.push((l) => l.suffix === suffix);
  }

  let ordered = catalog.byTicker;
  if (params.sort === "title") {
    catalog.byTitle ??= [...catalog.byTicker].sort((a, b) => {
      const t = a.entry.title < b.entry.title ? -1 : a.entry.title > b.entry.title ? 1 : 0;
      return t || (a.entry.ticker < b.entry.ticker ? -1 : 1);
    });
    ordered = catalog.byTitle;
  }

  let matches = filters.length ? ordered.filter((l) => filters.every((f) => f(l))) : ordered;

  const exact = (params.symbol ?? params.q)?.trim().toUpperCase();
  if (exact) {
    // Stable partition: exact-base rows first, everything else keeps its order.
    const head = matches.filter((l) => l.base === exact);
    if (head.length) matches = head.concat(matches.filter((l) => l.base !== exact));
  }

  return {
    symbols: matches.slice(params.offset, params.offset + params.limit).map((l) => l.entry),
    offset: params.offset,
    limit: params.limit,
    total: matches.length,
    sort: params.sort,
    ...(params.exchange ? { exchange: params.exchange } : {}),
  };
}
