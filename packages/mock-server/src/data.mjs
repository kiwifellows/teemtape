// Seed data for the mock server. Mirrors the wireframe sample so the CLI output
// matches what was approved in the wireframes. This is NOT the real backend —
// the Cloudflare Worker (milestone M0) will implement the same contract.

export const COMPANY_NAMES = {
  AAPL: "Apple Inc.",
  MSFT: "Microsoft Corp.",
  NVDA: "NVIDIA Corp.",
  TSLA: "Tesla Inc.",
  AMZN: "Amazon.com Inc.",
  GOOGL: "Alphabet Inc.",
  META: "Meta Platforms",
  AMD: "Advanced Micro Devices",
};

export const BASE_QUOTES = {
  AAPL: { price: 228.52, change: 1.84, pct: 0.81 },
  MSFT: { price: 478.13, change: -2.31, pct: -0.48 },
  NVDA: { price: 142.97, change: 4.12, pct: 2.97 },
  TSLA: { price: 251.44, change: -6.07, pct: -2.36 },
  AMZN: { price: 219.88, change: 0.42, pct: 0.19 },
  GOOGL: { price: 178.65, change: 2.05, pct: 1.16 },
  META: { price: 612.3, change: -3.88, pct: -0.63 },
  AMD: { price: 124.71, change: 1.12, pct: 0.91 },
};

// A default seeded watchlist so `list`/`notes` work immediately without `init`.
export const SEED_TOKEN = "6f1ed002ab5595859014ebf0951522d9";

export function seedWatchlists() {
  const map = new Map();
  map.set(SEED_TOKEN, {
    token: SEED_TOKEN,
    symbols: ["AAPL", "MSFT", "NVDA", "TSLA"],
    createdAt: new Date(Date.now() - 86_400_000).toISOString(),
  });
  return map;
}

export function seedNotes() {
  const now = Date.now();
  const iso = (minsAgo) => new Date(now - minsAgo * 60_000).toISOString();
  return [
    { id: "n_0001", token: SEED_TOKEN, symbol: "AAPL", author: "anon-7f3a9c", source: "web", body: "Watching the 225 support level — bounced here twice this week.", createdAt: iso(120) },
    { id: "n_0002", token: SEED_TOKEN, symbol: "AAPL", author: "agent-cli", source: "cli", body: "Earnings call scheduled. Flagging for review.", createdAt: iso(300) },
    { id: "n_0003", token: SEED_TOKEN, symbol: "NVDA", author: "anon-c41d77", source: "web", body: "Momentum still strong after the split.", createdAt: iso(30) },
    { id: "n_0004", token: SEED_TOKEN, symbol: "NVDA", author: "agent-cli", source: "cli", body: "Added to learning watchlist for the demo.", createdAt: iso(180) },
  ];
}
