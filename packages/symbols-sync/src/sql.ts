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
}

/**
 * Render an idempotent import: batched upserts keyed on the canonical
 * symbol, then delete rows in the imported markets that this batch did not
 * touch (delisted symbols). Apply with `wrangler d1 execute --file`.
 */
export function toImportSql(records: readonly SymbolRecord[], opts: SqlOptions): string {
  const suffixes = opts.cleanupSuffixes ?? [...new Set(records.map((r) => r.suffix))];
  const lines: string[] = [
    `-- teemtape symbols import (teemtape.symbol.v1): ${records.length} rows, markets ${
      suffixes.map((s) => (s === "" ? "US" : s)).join("+") || "none"
    }, synced_at ${opts.syncedAt}`,
  ];
  for (let i = 0; i < records.length; i += ROWS_PER_STATEMENT) {
    const batch = records.slice(i, i + ROWS_PER_STATEMENT);
    lines.push(
      `INSERT INTO symbols (${COLUMNS}) VALUES\n${batch.map(rowValues).join(",\n")}\n` +
        `ON CONFLICT(ticker) DO UPDATE SET base = excluded.base, suffix = excluded.suffix, ` +
        `exchange_code = excluded.exchange_code, mic = excluded.mic, currency = excluded.currency, ` +
        `country = excluded.country, title = excluded.title, isin = excluded.isin, ` +
        `cik_str = excluded.cik_str, source = excluded.source, synced_at = excluded.synced_at;`,
    );
  }
  if (suffixes.length) {
    lines.push(
      `DELETE FROM symbols WHERE suffix IN (${suffixes.map(lit).join(", ")}) AND synced_at < ${lit(opts.syncedAt)};`,
    );
  }
  return lines.join("\n") + "\n";
}
