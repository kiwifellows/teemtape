import { HttpError } from "./http.js";

const SYMBOL_RE = /^[A-Z][A-Z0-9.\-]{0,9}$/;
const MAX_SYMBOLS_PER_QUERY = 50;
const MAX_NOTE_LENGTH = 2000;
const SYMBOLS_PAGE_SIZE = 100;
const MAX_SYMBOLS_OFFSET = 1_000_000;
const MAX_SEARCH_LENGTH = 100;

/** Normalize + validate a ticker symbol. Throws HttpError(400) on invalid input. */
export function parseSymbol(raw: unknown): string {
  if (typeof raw !== "string") throw new HttpError(400, "symbol is required");
  const symbol = raw.trim().toUpperCase();
  if (!SYMBOL_RE.test(symbol)) throw new HttpError(400, `invalid symbol: ${raw}`);
  return symbol;
}

/** Parse a comma-separated symbols query param into a validated list. */
export function parseSymbolList(raw: string | null): string[] {
  const parts = (raw ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (parts.length === 0) throw new HttpError(400, "symbols query param is required");
  if (parts.length > MAX_SYMBOLS_PER_QUERY) {
    throw new HttpError(400, `too many symbols (max ${MAX_SYMBOLS_PER_QUERY})`);
  }
  return [...new Set(parts.map(parseSymbol))];
}

/** Validate a note body. */
export function parseNoteBody(raw: unknown): string {
  if (typeof raw !== "string") throw new HttpError(400, "body is required");
  const body = raw.trim();
  if (!body) throw new HttpError(400, "body is required");
  if (body.length > MAX_NOTE_LENGTH) {
    throw new HttpError(400, `body too long (max ${MAX_NOTE_LENGTH} chars)`);
  }
  return body;
}

/** Validate a note source. */
export function parseSource(raw: unknown): "web" | "cli" {
  return raw === "cli" ? "cli" : "web";
}

/** Validate a watchlist token shape (32 hex chars). */
export function parseToken(raw: string): string {
  if (!/^[0-9a-f]{32}$/.test(raw)) throw new HttpError(400, "invalid watchlist token");
  return raw;
}

function parseIntParam(raw: string | null, fallback: number, min: number, max: number): number {
  if (raw === null || raw === "") return fallback;
  const n = Number(raw);
  if (!Number.isInteger(n) || n < min || n > max) {
    throw new HttpError(400, `invalid number: ${raw}`);
  }
  return n;
}

/** Parse offset/limit for the symbols catalog (100 per page by default). */
export function parseSymbolsPagination(raw: URLSearchParams): { offset: number; limit: number } {
  return {
    offset: parseIntParam(raw.get("offset"), 0, 0, MAX_SYMBOLS_OFFSET),
    limit: parseIntParam(raw.get("limit"), SYMBOLS_PAGE_SIZE, 1, SYMBOLS_PAGE_SIZE),
  };
}

/** Alphabetical sort: ticker (default) or company title. */
export function parseSymbolsSort(raw: string | null): "ticker" | "title" {
  const sort = (raw ?? "ticker").toLowerCase();
  if (sort === "title" || sort === "name") return "title";
  if (sort === "ticker" || sort === "alpha" || sort === "alphabetical") return "ticker";
  throw new HttpError(400, `invalid sort: ${raw}`);
}

/** Optional search/filter string for the symbols catalog. */
export function parseOptionalSearch(raw: string | null, maxLen = MAX_SEARCH_LENGTH): string | undefined {
  if (raw === null) return undefined;
  const value = raw.trim();
  if (!value) return undefined;
  if (value.length > maxLen) throw new HttpError(400, `search too long (max ${maxLen} chars)`);
  return value;
}
