import { marketForSuffix, splitSymbol } from "@teemtape/api-client";

/**
 * `teemtape.symbol.v1` — one line of the normalised NDJSON that every
 * exchange adapter produces and the importer consumes. The schema is the
 * contract between "fetch anywhere" and "serve on Cloudflare": a job can run
 * on a laptop, in GitHub Actions or on a VPS as long as it emits these rows.
 * Documented in docs/plans/multi-market.md.
 */
export interface SymbolRecord {
  schema: "teemtape.symbol.v1";
  /** Canonical symbol: `BASE[.SUFFIX]`, upper-case (`AAPL`, `FPH.NZ`). */
  symbol: string;
  /** Exchange-local code (`FPH`). */
  base: string;
  /** Canonical suffix without the dot; `""` for US listings. */
  suffix: string;
  /** ISO 10383 MIC of the listing venue; `"XXXX"` when the source doesn't say. */
  mic: string;
  /** Short exchange label for the UI (`NASDAQ`, `NYSE`, `NZX`, `ASX`). */
  exchangeCode: string;
  /** ISO 4217. */
  currency: string;
  /** ISO 3166-1 alpha-2. */
  country: string;
  name: string;
  isin: string | null;
  /** SEC Central Index Key, US only. */
  cik: number | null;
  /** Adapter id that produced the row (`sec`, `asx`, `nzx`, `nse`). */
  source: string;
  /** ISO 8601 time the source was fetched. */
  syncedAt: string;
}

export const SCHEMA_ID = "teemtape.symbol.v1";

// NSE codes can contain "&" (M&M, J&KBANK) — Yahoo spells them the same way.
const BASE_RE = /^[A-Z0-9][A-Z0-9.&\-]{0,15}$/;
const SUFFIX_RE = /^[A-Z]{0,2}$/;
const ISIN_RE = /^[A-Z]{2}[A-Z0-9]{9}[0-9]$/;

/** Build the canonical symbol for a base code on a market suffix. */
export function canonicalSymbol(base: string, suffix: string): string {
  const b = base.trim().toUpperCase();
  return suffix ? `${b}.${suffix.toUpperCase()}` : b;
}

/**
 * Validate one record. Returns a list of problems (empty = valid) rather
 * than throwing so the importer can report every bad row at once.
 */
export function validateRecord(rec: unknown): string[] {
  const problems: string[] = [];
  if (!rec || typeof rec !== "object") return ["not an object"];
  const r = rec as Record<string, unknown>;
  const str = (k: string): string | undefined => (typeof r[k] === "string" ? (r[k] as string) : undefined);

  if (r.schema !== SCHEMA_ID) problems.push(`schema must be ${SCHEMA_ID}`);
  const base = str("base");
  const suffix = str("suffix");
  const symbol = str("symbol");
  if (!base || !BASE_RE.test(base)) problems.push(`base invalid: ${String(r.base)}`);
  if (suffix === undefined || !SUFFIX_RE.test(suffix)) problems.push(`suffix invalid: ${String(r.suffix)}`);
  if (base && suffix !== undefined && symbol !== canonicalSymbol(base, suffix)) {
    problems.push(`symbol ${String(symbol)} does not match base+suffix`);
  }
  if (suffix !== undefined && !marketForSuffix(suffix)) problems.push(`unknown market suffix: ${suffix}`);
  if (symbol && splitSymbol(symbol).suffix !== (suffix ?? "")) problems.push(`symbol ${symbol} splits to a different suffix`);
  for (const k of ["mic", "exchangeCode", "currency", "country", "name", "source", "syncedAt"]) {
    if (!str(k)) problems.push(`${k} required`);
  }
  if (str("mic") && !/^[A-Z0-9]{4}$/.test(str("mic")!)) problems.push(`mic must be 4 chars: ${str("mic")}`);
  if (str("currency") && !/^[A-Z]{3}$/.test(str("currency")!)) problems.push(`currency must be ISO 4217: ${str("currency")}`);
  if (str("country") && !/^[A-Z]{2}$/.test(str("country")!)) problems.push(`country must be alpha-2: ${str("country")}`);
  if (r.isin !== null && (typeof r.isin !== "string" || !ISIN_RE.test(r.isin))) problems.push(`isin invalid: ${String(r.isin)}`);
  if (r.cik !== null && (typeof r.cik !== "number" || !Number.isInteger(r.cik) || r.cik < 0)) problems.push(`cik invalid: ${String(r.cik)}`);
  return problems;
}

export interface CollisionReport {
  /** Rows dropped as exact duplicates of an earlier row (same symbol, same ISIN or no ISIN). */
  duplicates: number;
  /** Same canonical symbol with two different ISINs — needs a human, import refuses. */
  conflicts: Array<{ symbol: string; isins: string[] }>;
}

/**
 * De-duplicate by canonical symbol. Two rows with the same symbol are only
 * a problem when both carry an ISIN and the ISINs differ — that means two
 * different securities are fighting over one identity, which the catalog
 * must never silently resolve.
 */
export function dedupe(records: SymbolRecord[]): { records: SymbolRecord[]; report: CollisionReport } {
  const bySymbol = new Map<string, SymbolRecord>();
  const report: CollisionReport = { duplicates: 0, conflicts: [] };
  for (const rec of records) {
    const prev = bySymbol.get(rec.symbol);
    if (!prev) {
      bySymbol.set(rec.symbol, rec);
      continue;
    }
    if (prev.isin && rec.isin && prev.isin !== rec.isin) {
      const existing = report.conflicts.find((c) => c.symbol === rec.symbol);
      if (existing) existing.isins.push(rec.isin);
      else report.conflicts.push({ symbol: rec.symbol, isins: [prev.isin, rec.isin] });
      continue;
    }
    report.duplicates += 1;
    // Prefer the row that knows more (an ISIN or a real MIC).
    if ((!prev.isin && rec.isin) || (prev.mic === "XXXX" && rec.mic !== "XXXX")) bySymbol.set(rec.symbol, rec);
  }
  return { records: [...bySymbol.values()], report };
}
