import { findMarket, type SymbolEntry, type SymbolsListResponse } from "@teemtape/api-client";
import { loadCatalog, searchCatalog } from "./catalog.js";
import type { Env } from "./env.js";

export interface SymbolsListParams {
  offset: number;
  limit: number;
  sort: "ticker" | "title";
  q?: string;
  symbol?: string;
  name?: string;
  /** Canonical market code from parseExchangeFilter, e.g. "NZX". */
  exchange?: string;
}

interface WhereClause {
  sql: string;
  binds: (string | number)[];
}

function likePattern(term: string): string {
  return `%${term.toLowerCase()}%`;
}

function buildWhere(params: SymbolsListParams): WhereClause {
  const parts: string[] = [];
  const binds: (string | number)[] = [];

  if (params.q) {
    const pattern = likePattern(params.q);
    parts.push("(LOWER(ticker) LIKE ? OR LOWER(title) LIKE ?)");
    binds.push(pattern, pattern);
  }
  if (params.symbol) {
    parts.push("LOWER(ticker) LIKE ?");
    binds.push(likePattern(params.symbol));
  }
  if (params.name) {
    parts.push("LOWER(title) LIKE ?");
    binds.push(likePattern(params.name));
  }
  if (params.exchange) {
    // Markets are identified by canonical suffix ('' = every US venue).
    const market = findMarket(params.exchange);
    parts.push("suffix = ?");
    binds.push(market?.suffix ?? params.exchange);
  }

  return {
    sql: parts.length ? `WHERE ${parts.join(" AND ")}` : "",
    binds,
  };
}

/**
 * Paginated symbols catalog (alphabetical or offset paging, optional search).
 *
 * A bare query such as "AMP" matches every listing with that exchange-local
 * code (`AMP`, `AMP.AX`), and those exact-base rows sort first so the
 * caller can see the collision instead of silently getting the US one.
 *
 * Served from the in-memory snapshot (catalog.ts) whenever one has been
 * published; the D1 query below is the fallback until the first sync run
 * and the reference for the search semantics.
 */
export async function listSymbolsCatalog(
  env: Env,
  ctx: ExecutionContext,
  params: SymbolsListParams,
): Promise<SymbolsListResponse> {
  const catalog = await loadCatalog(env, ctx);
  if (catalog) return searchCatalog(catalog, params);
  return querySymbolsTable(env, params);
}

/** The D1 version of the search: two full scans per call, so only a fallback. */
async function querySymbolsTable(env: Env, params: SymbolsListParams): Promise<SymbolsListResponse> {
  const where = buildWhere(params);
  const orderBy = params.sort === "title" ? "title ASC, ticker ASC" : "ticker ASC";

  const exact = (params.symbol ?? params.q)?.trim().toUpperCase();
  const rank = exact ? "CASE WHEN base = ? THEN 0 ELSE 1 END, " : "";
  const rankBinds = exact ? [exact] : [];

  const countRow = await env.DB.prepare(`SELECT COUNT(*) AS total FROM symbols ${where.sql}`)
    .bind(...where.binds)
    .first<{ total: number }>();

  const rows = await env.DB.prepare(
    `SELECT ticker, exchange_code AS exchange, mic, currency, country, title, isin, cik_str AS cikStr
       FROM symbols
       ${where.sql}
      ORDER BY ${rank}${orderBy}
      LIMIT ? OFFSET ?`,
  )
    .bind(...where.binds, ...rankBinds, params.limit, params.offset)
    .all<SymbolEntry>();

  return {
    symbols: rows.results,
    offset: params.offset,
    limit: params.limit,
    total: countRow?.total ?? 0,
    sort: params.sort,
    ...(params.exchange ? { exchange: params.exchange } : {}),
  };
}
