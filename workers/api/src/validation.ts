import { HttpError } from "./http.js";

const SYMBOL_RE = /^[A-Z][A-Z0-9.\-]{0,9}$/;
const MAX_SYMBOLS_PER_QUERY = 50;
const MAX_NOTE_LENGTH = 2000;

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
