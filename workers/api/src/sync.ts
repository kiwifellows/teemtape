import type { Env } from "./env.js";

const SEC_TICKERS_URL = "https://www.sec.gov/files/company_tickers.json";
const BATCH_SIZE = 100;

export interface SecTickerEntry {
  cik_str: number;
  ticker: string;
  title: string;
}

type SecTickersJson = Record<string, SecTickerEntry>;

export interface SyncResult {
  upserted: number;
  deleted: number;
}

/** Fetch and normalise the SEC company tickers JSON payload. */
export async function fetchSecTickers(userAgent: string): Promise<SecTickerEntry[]> {
  const res = await fetch(SEC_TICKERS_URL, {
    headers: {
      "User-Agent": userAgent,
      Accept: "application/json",
    },
  });
  if (!res.ok) throw new Error(`SEC fetch failed: ${res.status}`);

  const data = (await res.json()) as SecTickersJson;
  return Object.values(data).map((entry) => ({
    cik_str: entry.cik_str,
    ticker: entry.ticker.trim().toUpperCase(),
    title: entry.title.trim(),
  }));
}

async function upsertBatch(db: D1Database, batch: SecTickerEntry[], syncedAt: string): Promise<void> {
  const statements = batch.map((entry) =>
    db
      .prepare(
        `INSERT INTO symbols (ticker, cik_str, title, synced_at)
         VALUES (?, ?, ?, ?)
         ON CONFLICT(ticker) DO UPDATE SET
           cik_str = excluded.cik_str,
           title = excluded.title,
           synced_at = excluded.synced_at`,
      )
      .bind(entry.ticker, entry.cik_str, entry.title, syncedAt),
  );
  await db.batch(statements);
}

/** Upsert all SEC tickers, then remove rows from previous sync batches. */
export async function syncSymbols(env: Env): Promise<SyncResult> {
  const syncedAt = new Date().toISOString();
  const entries = await fetchSecTickers(env.SEC_USER_AGENT);

  for (let i = 0; i < entries.length; i += BATCH_SIZE) {
    await upsertBatch(env.DB, entries.slice(i, i + BATCH_SIZE), syncedAt);
  }

  const deleted = await env.DB.prepare("DELETE FROM symbols WHERE synced_at < ?").bind(syncedAt).run();

  return {
    upserted: entries.length,
    deleted: deleted.meta.changes ?? 0,
  };
}
