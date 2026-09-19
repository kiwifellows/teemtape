import type { SymbolRecord } from "./schema.js";

/** Rows per INSERT statement; D1 caps a single statement at 100 KB, this stays well under. */
const ROWS_PER_STATEMENT = 200;

const COLUMNS = "ticker, base, suffix, exchange_code, mic, currency, country, title, isin, cik_str, source, synced_at";

function lit(value: string | number | null): string {
  if (value === null) return "NULL";
  if (typeof value === "number") return String(value);
  // SQL string literal: double embedded quotes; strip control characters that
  // have no business in a company name.
  return `'${value.replace(/[\u0000-\u001f\u007f]/g, " ").replace(/'/g, "''")}'`;
}

function rowValues(r: SymbolRecord): string {
  return `(${[r.symbol, r.base, r.suffix, r.exchangeCode, r.mic, r.currency, r.country, r.name, r.isin, r.cik, r.source, r.syncedAt].map(lit).join(", ")})`;
}

export interface SqlOptions {
  /**
   * Markets (by canonical suffix, "" = US) whose stale rows should be deleted
   * after the upsert. Defaults to every suffix present in `records`, so
   * importing only NZX never wipes the US catalog.
   */
  cleanupSuffixes?: string[];
  /** Batch marker; rows older than this in the cleaned-up markets are removed. */
  syncedAt: string;
  /**
   * What the `symbols` table holds right now (see `CURRENT_ROWS_SQL`). When
   * given, the import becomes a diff: only rows whose content changed are
   * upserted and only tickers that vanished from the feed are deleted.
   * Without it every row is rewritten — ~3 D1 row-writes per symbol with
   * indexes, which on the free tier can burn the whole account's daily write
   * budget in one run and take sign-in/billing down with it.
   */
  current?: readonly CurrentRow[];
}

/** One row of the live table, as returned by `CURRENT_ROWS_SQL` via `wrangler d1 execute --json`. */
export interface CurrentRow {
  ticker: string;
  base: string;
  suffix: string;
  exchange_code: string;
  mic: string;
  currency: string;
  country: string;
  title: string;
  isin: string | null;
  cik_str: number | null;
  source: string;
}

/** Export the live table for a diff import (paste into `wrangler d1 execute --json --command`). */
export const CURRENT_ROWS_SQL =
  "SELECT ticker, base, suffix, exchange_code, mic, currency, country, title, isin, cik_str, source FROM symbols";

/** Everything except synced_at: the fields whose change is worth a write. */
function contentKey(r: CurrentRow): string {
  return JSON.stringify([r.base, r.suffix, r.exchange_code, r.mic, r.currency, r.country, r.title, r.isin ?? null, r.cik_str ?? null, r.source]);
}

function toCurrent(r: SymbolRecord): CurrentRow {
  return {
    ticker: r.symbol,
    base: r.base,
    suffix: r.suffix,
    exchange_code: r.exchangeCode,
    mic: r.mic,
    currency: r.currency,
    country: r.country,
    title: r.name,
    isin: r.isin,
    cik_str: r.cik,
    source: r.source,
  };
}

export interface ImportPlan {
  /** Rows to upsert (all of them without `current`; only new/changed with it). */
  upserts: SymbolRecord[];
  /** Tickers to delete outright (diff mode only). */
  deletes: string[];
  /** Whether the trailing `synced_at`-based cleanup applies (full mode only). */
  cleanupBySyncedAt: boolean;
  unchanged: number;
}

/** Decide what the SQL must touch. Exposed so the CLI can report it and tests can assert on it. */
export function planImport(records: readonly SymbolRecord[], opts: SqlOptions): ImportPlan {
  const suffixes = new Set(opts.cleanupSuffixes ?? records.map((r) => r.suffix));
  if (!opts.current) return { upserts: [...records], deletes: [], cleanupBySyncedAt: true, unchanged: 0 };

  const live = new Map(opts.current.map((r) => [r.ticker, contentKey(r)]));
  const upserts: SymbolRecord[] = [];
  let unchanged = 0;
  const seen = new Set<string>();
  for (const r of records) {
    seen.add(r.symbol);
    if (live.get(r.symbol) === contentKey(toCurrent(r))) unchanged++;
    else upserts.push(r);
  }
  const deletes = opts.current
    .filter((r) => suffixes.has(r.suffix) && !seen.has(r.ticker))
    .map((r) => r.ticker);
  return { upserts, deletes, cleanupBySyncedAt: false, unchanged };
}

/**
 * Render an idempotent import: batched upserts keyed on the canonical
 * symbol, then delete rows in the imported markets that this batch did not
 * touch (delisted symbols). Apply with `wrangler d1 execute --file`.
 */
export function toImportSql(records: readonly SymbolRecord[], opts: SqlOptions): string {
  const suffixes = opts.cleanupSuffixes ?? [...new Set(records.map((r) => r.suffix))];
  const plan = planImport(records, opts);
  const lines: string[] = [
    `-- teemtape symbols import (teemtape.symbol.v1): ${records.length} rows, markets ${
      suffixes.map((s) => (s === "" ? "US" : s)).join("+") || "none"
    }, synced_at ${opts.syncedAt}` +
      (opts.current ? ` — diff: ${plan.upserts.length} upsert, ${plan.deletes.length} delete, ${plan.unchanged} unchanged` : ""),
  ];
  for (let i = 0; i < plan.upserts.length; i += ROWS_PER_STATEMENT) {
    const batch = plan.upserts.slice(i, i + ROWS_PER_STATEMENT);
    lines.push(
      `INSERT INTO symbols (${COLUMNS}) VALUES\n${batch.map(rowValues).join(",\n")}\n` +
        `ON CONFLICT(ticker) DO UPDATE SET base = excluded.base, suffix = excluded.suffix, ` +
        `exchange_code = excluded.exchange_code, mic = excluded.mic, currency = excluded.currency, ` +
        `country = excluded.country, title = excluded.title, isin = excluded.isin, ` +
        `cik_str = excluded.cik_str, source = excluded.source, synced_at = excluded.synced_at;`,
    );
  }
  for (let i = 0; i < plan.deletes.length; i += ROWS_PER_STATEMENT) {
    const batch = plan.deletes.slice(i, i + ROWS_PER_STATEMENT);
    lines.push(`DELETE FROM symbols WHERE ticker IN (${batch.map(lit).join(", ")});`);
  }
  if (plan.cleanupBySyncedAt && suffixes.length) {
    lines.push(
      `DELETE FROM symbols WHERE suffix IN (${suffixes.map(lit).join(", ")}) AND synced_at < ${lit(opts.syncedAt)};`,
    );
  }
  return lines.join("\n") + "\n";
}
