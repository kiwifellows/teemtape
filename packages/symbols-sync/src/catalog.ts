import type { CurrentRow } from "./sql.js";

/**
 * `teemtape.catalog.v1` — the serving snapshot of the symbols catalog.
 *
 * D1 stays the durable store, but searching it with `LIKE '%q%'` scans the
 * whole table twice per keystroke (~40k rows read for ~15k listings), which
 * on the Free plan's 5M rows/day is gone after a few hundred searches. The
 * catalog only changes fortnightly, so after each import the workflow renders
 * this snapshot from the live table and puts it in one KV key
 * (`symbols:catalog:v1`); the Worker loads it into memory once per isolate
 * and answers `/api/symbols` from there (workers/api/src/catalog.ts).
 *
 * Rows are column tuples rather than objects, and only carry what the
 * Worker cannot derive from the ticker through the market registry (base,
 * suffix, currency and country are dropped): ~2.1 MB → ~0.8 MB raw for
 * 14.7k rows (~230 KB gzipped), and JSON.parse stays well inside the Free
 * plan's CPU budget. Sorted by ticker so the default listing order needs no
 * sort at serve time.
 */
export interface CatalogSnapshot {
  schema: typeof CATALOG_SCHEMA;
  generatedAt: string;
  count: number;
  columns: typeof CATALOG_COLUMNS;
  rows: CatalogRow[];
}

export const CATALOG_SCHEMA = "teemtape.catalog.v1";
export const CATALOG_KV_KEY = "symbols:catalog:v1";
export const CATALOG_COLUMNS = ["ticker", "exchange", "mic", "title", "isin", "cikStr"] as const;

/** One listing, in `CATALOG_COLUMNS` order. */
export type CatalogRow = [
  ticker: string,
  exchange: string,
  mic: string,
  title: string,
  isin: string | null,
  cikStr: number | null,
];

/** Render the live table (see `CURRENT_ROWS_SQL`) as a snapshot. */
export function toCatalogSnapshot(rows: readonly CurrentRow[], generatedAt = new Date().toISOString()): CatalogSnapshot {
  const sorted = [...rows].sort((a, b) => (a.ticker < b.ticker ? -1 : a.ticker > b.ticker ? 1 : 0));
  return {
    schema: CATALOG_SCHEMA,
    generatedAt,
    count: sorted.length,
    columns: CATALOG_COLUMNS,
    rows: sorted.map((r) => [r.ticker, r.exchange_code, r.mic, r.title, r.isin, r.cik_str]),
  };
}
