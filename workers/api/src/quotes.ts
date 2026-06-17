import type { Quote, QuotesResponse } from "@teemtape/api-client";
import type { Env } from "./env.js";

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

function delaySeconds(env: Env): number {
  const n = Number(env.QUOTE_DELAY_SECONDS ?? "60");
  return Number.isFinite(n) && n >= 0 ? n : 60;
}

/** Effective provider: only "polygon" when a key is actually configured. */
function effectiveProvider(env: Env): "polygon" | "sample" {
  return (env.QUOTES_PROVIDER ?? "sample") === "polygon" && env.POLYGON_API_KEY
    ? "polygon"
    : "sample";
}

/** Deterministic sample quote — used in dev and as a fallback. */
function sampleQuote(symbol: string, delay: number): Quote {
  const asOf = new Date(Date.now() - delay * 1000).toISOString();
  const base = BASE[symbol];
  if (base) {
    return { symbol, name: COMPANY_NAMES[symbol] ?? symbol, ...base, asOf };
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
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

async function quoteFor(env: Env, symbol: string, provider: "polygon" | "sample", delay: number): Promise<Quote> {
  const cacheKey = `quote:${provider}:${symbol}`;
  const cached = await env.QUOTES_CACHE.get(cacheKey, "json");
  if (cached) return cached as Quote;

  let quote: Quote;
  if (provider === "polygon" && env.POLYGON_API_KEY) {
    try {
      quote = await polygonQuote(symbol, env.POLYGON_API_KEY, delay);
    } catch {
      // Degrade gracefully rather than failing the whole request.
      quote = sampleQuote(symbol, delay);
    }
  } else {
    quote = sampleQuote(symbol, delay);
  }

  // Cache for the delay window (KV minimum TTL is 60s) to respect rate limits.
  await env.QUOTES_CACHE.put(cacheKey, JSON.stringify(quote), {
    expirationTtl: Math.max(60, delay),
  });
  return quote;
}

/** Get delayed quotes for a list of symbols. */
export async function getQuotes(env: Env, symbols: string[]): Promise<QuotesResponse> {
  const delay = delaySeconds(env);
  const provider = effectiveProvider(env);
  const quotes = await Promise.all(symbols.map((s) => quoteFor(env, s, provider, delay)));
  return { quotes, delayedSeconds: delay, source: provider };
}
