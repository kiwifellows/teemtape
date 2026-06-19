import type { Quote, QuotesResponse } from "@teemtape/api-client";
import type { Env } from "./env.js";

// ---------------------------------------------------------------------------
// Constants & helpers
// ---------------------------------------------------------------------------

const COMPANY_NAMES: Record<string, string> = {
  AAPL: "Apple Inc.",
  MSFT: "Microsoft Corp.",
  NVDA: "NVIDIA Corp.",
  TSLA: "Tesla Inc.",
  AMZN: "Amazon.com Inc.",
  GOOGL: "Alphabet Inc.",
  META: "Meta Platforms",
  AMD: "Advanced Micro Devices",
};

const BASE: Record<string, { price: number; change: number; pct: number }> = {
  AAPL: { price: 228.52, change: 1.84, pct: 0.81 },
  MSFT: { price: 478.13, change: -2.31, pct: -0.48 },
  NVDA: { price: 142.97, change: 4.12, pct: 2.97 },
  TSLA: { price: 251.44, change: -6.07, pct: -2.36 },
  AMZN: { price: 219.88, change: 0.42, pct: 0.19 },
  GOOGL: { price: 178.65, change: 2.05, pct: 1.16 },
  META: { price: 612.3, change: -3.88, pct: -0.63 },
  AMD: { price: 124.71, change: 1.12, pct: 0.91 },
};

export type QuoteProvider = "polygon" | "yahoo" | "stooq" | "sample";

// Cache key version — bump if the stored shape changes to avoid stale reads.
const CACHE_KEY_VERSION = "v2";

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function delaySeconds(env: Env): number {
  const n = Number(env.QUOTE_DELAY_SECONDS ?? "60");
  return Number.isFinite(n) && n >= 0 ? n : 60;
}

function cacheTtlSeconds(env: Env): number {
  const n = Number(env.QUOTE_CACHE_TTL_SECONDS ?? "300");
  // KV minimum TTL is 60 seconds.
  return Number.isFinite(n) && n >= 60 ? n : 300;
}

/**
 * Resolve the ordered list of providers to try from QUOTES_PROVIDER.
 *
 * QUOTES_PROVIDER can be a comma-separated priority list, e.g.:
 *   "yahoo,stooq,polygon,sample"
 *
 * Polygon is silently skipped when POLYGON_API_KEY is absent.
 * "sample" is always appended as the final fallback if not already in the list.
 */
function effectiveProviders(env: Env): QuoteProvider[] {
  const raw = (env.QUOTES_PROVIDER ?? "yahoo,stooq,sample").toLowerCase();
  const requested = raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const result: QuoteProvider[] = [];
  for (const p of requested) {
    if (p === "polygon") {
      if (env.POLYGON_API_KEY) result.push("polygon");
      // skip silently if no key
    } else if (p === "yahoo" || p === "stooq" || p === "sample") {
      result.push(p as QuoteProvider);
    }
  }

  if (!result.includes("sample")) result.push("sample");
  return result;
}

// ---------------------------------------------------------------------------
// Provider implementations
// ---------------------------------------------------------------------------

/** Deterministic sample quote — used in dev and as the final fallback. */
function sampleQuote(symbol: string, delay: number): Quote {
  const asOf = new Date(Date.now() - delay * 1000).toISOString();
  const base = BASE[symbol];
  const cachedAt = new Date().toISOString();
  if (base) {
    return { symbol, name: COMPANY_NAMES[symbol] ?? symbol, ...base, asOf, cachedAt };
  }
  const seed = [...symbol].reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  const price = 50 + (seed % 400) + 0.5;
  const change = ((seed % 7) - 3) * 0.5;
  return {
    symbol,
    name: `${symbol} (sample)`,
    price,
    change,
    pct: Number(((change / price) * 100).toFixed(2)),
    asOf,
    cachedAt,
  };
}

interface PolygonPrev {
  results?: Array<{ c: number; o: number; t: number }>;
}

/** Fetch a delayed quote from the Polygon free tier (previous-day aggregate). */
async function polygonQuote(symbol: string, apiKey: string, delay: number): Promise<Quote> {
  const url = `https://api.polygon.io/v2/aggs/ticker/${encodeURIComponent(symbol)}/prev?adjusted=true&apiKey=${apiKey}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`polygon ${res.status}`);
  const data = (await res.json()) as PolygonPrev;
  const row = data.results?.[0];
  if (!row) throw new Error("polygon: no results");
  const change = row.c - row.o;
  return {
    symbol,
    name: COMPANY_NAMES[symbol] ?? symbol,
    price: round2(row.c),
    change: round2(change),
    pct: round2(row.o ? (change / row.o) * 100 : 0),
    asOf: new Date(row.t || Date.now() - delay * 1000).toISOString(),
    cachedAt: new Date().toISOString(),
  };
}

interface YahooChartMeta {
  symbol: string;
  regularMarketPrice: number;
  previousClose?: number;
  chartPreviousClose?: number;
  longName?: string;
  shortName?: string;
  regularMarketTime?: number;
}
interface YahooChartResponse {
  chart: {
    result?: Array<{ meta: YahooChartMeta }>;
    error?: { description: string };
  };
}

/**
 * Fetch a quote from the Yahoo Finance v8 chart API.
 * No API key required. Uses the previous close from the chart metadata.
 *
 * Note: this calls Yahoo Finance's public (undocumented) API directly via HTTP;
 * the yahoo-finance2 npm package cannot run inside a Cloudflare Worker because
 * it depends on Node.js built-ins. The raw HTTP approach produces the same data.
 */
async function yahooQuote(symbol: string, delay: number): Promise<Quote> {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=1d&includePrePost=false`;
  const res = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; teemtape-quotes/1.0)",
      Accept: "application/json",
    },
  });
  if (!res.ok) throw new Error(`yahoo ${res.status}`);
  const data = (await res.json()) as YahooChartResponse;
  const result = data.chart?.result?.[0];
  if (!result) {
    const desc = data.chart?.error?.description ?? "no results";
    throw new Error(`yahoo: ${desc}`);
  }
  const meta = result.meta;
  const prevClose = meta.previousClose ?? meta.chartPreviousClose ?? meta.regularMarketPrice;
  const change = meta.regularMarketPrice - prevClose;
  return {
    symbol,
    name: meta.longName ?? meta.shortName ?? symbol,
    price: round2(meta.regularMarketPrice),
    change: round2(change),
    pct: round2(prevClose ? (change / prevClose) * 100 : 0),
    asOf: new Date((meta.regularMarketTime ?? Date.now() / 1000) * 1000 - delay * 1000).toISOString(),
    cachedAt: new Date().toISOString(),
  };
}

/**
 * Fetch a quote from Stooq's free CSV endpoint.
 * No API key required. Returns end-of-day OHLC data.
 *
 * Stooq CSV format (header row + data row):
 *   Symbol,Date,Time,Open,High,Low,Close,Volume,Name
 *
 * US tickers are supported without a suffix (e.g. "AAPL", "MSFT").
 * Stooq expects lowercase symbols in the query string.
 */
async function stooqQuote(symbol: string, delay: number): Promise<Quote> {
  const s = symbol.toLowerCase();
  const url = `https://stooq.com/q/l/?s=${encodeURIComponent(s)}&f=sd2t2ohlcvn&e=csv`;
  const res = await fetch(url, {
    headers: { "User-Agent": "teemtape-quotes/1.0" },
  });
  if (!res.ok) throw new Error(`stooq ${res.status}`);
  const text = await res.text();
  // Expected: header line + data line, comma-separated
  const lines = text.trim().split("\n");
  if (lines.length < 2) throw new Error("stooq: empty response");
  const parts = lines[1]!.split(",");
  // Columns: Symbol(0), Date(1), Time(2), Open(3), High(4), Low(5), Close(6), Volume(7), Name(8+)
  if (parts.length < 7) throw new Error("stooq: invalid CSV format");
  const open = parseFloat(parts[3]!);
  const close = parseFloat(parts[6]!);
  if (!Number.isFinite(close) || close <= 0) throw new Error("stooq: invalid or unavailable price");
  const change = close - open;
  const name = parts.slice(8).join(",").trim() || symbol;
  return {
    symbol,
    name,
    price: round2(close),
    change: round2(change),
    pct: round2(open ? (change / open) * 100 : 0),
    asOf: new Date(Date.now() - delay * 1000).toISOString(),
    cachedAt: new Date().toISOString(),
  };
}

// ---------------------------------------------------------------------------
// Dispatch & caching
// ---------------------------------------------------------------------------

/** Fetch a quote from a specific provider (no caching). */
async function fetchFromProvider(
  provider: QuoteProvider,
  symbol: string,
  env: Env,
  delay: number,
): Promise<Quote> {
  switch (provider) {
    case "polygon":
      return polygonQuote(symbol, env.POLYGON_API_KEY!, delay);
    case "yahoo":
      return yahooQuote(symbol, delay);
    case "stooq":
      return stooqQuote(symbol, delay);
    case "sample":
    default:
      return sampleQuote(symbol, delay);
  }
}

/**
 * Fetch a quote for one symbol, trying providers in priority order.
 * The first successful result is cached in KV for `cacheTtlSeconds`.
 *
 * Cache key: `quote:v2:{symbol}` — shared across all callers.
 * This means user1 requesting AAPL at 8:20 am and user2 requesting AAPL at
 * 8:24 am both receive the same cached quote (assuming a 5-minute TTL).
 */
async function quoteFor(
  env: Env,
  symbol: string,
  providers: QuoteProvider[],
  delay: number,
  ttl: number,
): Promise<{ quote: Quote; provider: QuoteProvider; fromCache: boolean }> {
  const cacheKey = `quote:${CACHE_KEY_VERSION}:${symbol}`;

  const cached = await env.QUOTES_CACHE.get(cacheKey, "json");
  if (cached) {
    return { quote: cached as Quote, provider: "sample", fromCache: true };
  }

  let lastErr: unknown;
  for (const provider of providers) {
    try {
      const quote = await fetchFromProvider(provider, symbol, env, delay);
      // Overwrite cachedAt with a stable "now" to ensure all quotes in the same
      // batch share a consistent timestamp.
      const now = new Date().toISOString();
      const toStore: Quote = { ...quote, cachedAt: now };
      await env.QUOTES_CACHE.put(cacheKey, JSON.stringify(toStore), {
        expirationTtl: ttl,
      });
      return { quote: toStore, provider, fromCache: false };
    } catch (err) {
      console.warn(`quotes: provider "${provider}" failed for ${symbol}:`, err);
      lastErr = err;
    }
  }

  // All providers failed — this should not happen in practice since "sample" is
  // always last and never throws. Re-throw the last error to surface it.
  throw lastErr;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/** Get delayed quotes for a list of symbols. */
export async function getQuotes(env: Env, symbols: string[]): Promise<QuotesResponse> {
  const delay = delaySeconds(env);
  const ttl = cacheTtlSeconds(env);
  const providers = effectiveProviders(env);

  const results = await Promise.all(symbols.map((s) => quoteFor(env, s, providers, delay, ttl)));

  // Report the first non-cached provider used (or "sample" if all came from cache).
  const freshResult = results.find((r) => !r.fromCache);
  const source = freshResult?.provider ?? providers[0] ?? "sample";

  return {
    quotes: results.map((r) => r.quote),
    delayedSeconds: delay,
    source,
    cacheTtlSeconds: ttl,
  };
}
