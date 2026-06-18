import type { SymbolEntry, SymbolsListResponse } from "@teemtape/api-client";
import type { Env } from "./env.js";

export interface SymbolsListParams {
  offset: number;
  limit: number;
  sort: "ticker" | "title";
  q?: string;
  symbol?: string;
  name?: string;
}

interface WhereClause {
  sql: string;
  binds: string[];
}

function likePattern(term: string): string {
  return `%${term.toLowerCase()}%`;
}

function buildWhere(params: SymbolsListParams): WhereClause {
  const parts: string[] = [];
  const binds: string[] = [];

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

  return {
    sql: parts.length ? `WHERE ${parts.join(" AND ")}` : "",
    binds,
  };
}

/** Paginated SEC symbol catalog (alphabetical or offset paging, optional search). */
export async function listSymbolsCatalog(env: Env, params: SymbolsListParams): Promise<SymbolsListResponse> {
  const where = buildWhere(params);
  const orderBy = params.sort === "title" ? "title ASC, ticker ASC" : "ticker ASC";

  const countRow = await env.DB.prepare(`SELECT COUNT(*) AS total FROM symbols ${where.sql}`)
    .bind(...where.binds)
    .first<{ total: number }>();

  const rows = await env.DB.prepare(
    `SELECT ticker, cik_str AS cikStr, title
       FROM symbols
       ${where.sql}
      ORDER BY ${orderBy}
      LIMIT ? OFFSET ?`,
  )
    .bind(...where.binds, params.limit, params.offset)
    .all<SymbolEntry>();

  return {
    symbols: rows.results,
    offset: params.offset,
    limit: params.limit,
    total: countRow?.total ?? 0,
    sort: params.sort,
  };
}
