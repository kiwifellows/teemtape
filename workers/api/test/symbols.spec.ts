import { env, SELF } from "cloudflare:test";
import { beforeEach, describe, expect, it } from "vitest";

const BASE = "https://api.test";
const SYNCED_AT = "2026-01-01T00:00:00.000Z";

async function body<T>(res: Response): Promise<T> {
  return (await res.json()) as T;
}

// [ticker, base, suffix, exchange, mic, currency, country, title, isin, cik]
const ROWS = [
  ["AAPL", "AAPL", "", "NASDAQ", "XNAS", "USD", "US", "Apple Inc.", null, 320193],
  ["MSFT", "MSFT", "", "NASDAQ", "XNAS", "USD", "US", "MICROSOFT CORP", null, 789019],
  ["NVDA", "NVDA", "", "NASDAQ", "XNAS", "USD", "US", "NVIDIA CORP", null, 1045810],
  ["TSLA", "TSLA", "", "NASDAQ", "XNAS", "USD", "US", "Tesla, Inc.", null, 1318605],
] as const;

// The classic collision: same exchange-local code, two different companies.
const COLLISION_ROWS = [
  ["AMP", "AMP", "", "NYSE", "XNYS", "USD", "US", "AMERIPRISE FINANCIAL INC", null, 820027],
  ["AMP.AX", "AMP", "AX", "ASX", "XASX", "AUD", "AU", "AMP LIMITED", null, null],
  ["FPH.NZ", "FPH", "NZ", "NZX", "XNZE", "NZD", "NZ", "Fisher & Paykel Healthcare", "NZFAPE0001S2", null],
] as const;

async function seedSymbols(rows: readonly (readonly (string | number | null)[])[] = ROWS): Promise<void> {
  for (const row of rows) {
    await env.DB.prepare(
      `INSERT INTO symbols (ticker, base, suffix, exchange_code, mic, currency, country, title, isin, cik_str, source, synced_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'test', ?)`,
    )
      .bind(...row, SYNCED_AT)
      .run();
  }
}

describe("symbols catalog API", () => {
  beforeEach(async () => {
    await env.DB.prepare("DELETE FROM symbols").run();
    await seedSymbols();
  });

  it("lists symbols alphabetically by ticker with paging", async () => {
    const res = await SELF.fetch(`${BASE}/api/symbols?offset=0&limit=2&sort=ticker`);
    expect(res.status).toBe(200);
    const data = await body<{
      symbols: Array<{ ticker: string }>;
      offset: number;
      limit: number;
      total: number;
      sort: string;
    }>(res);
    expect(data.sort).toBe("ticker");
    expect(data.offset).toBe(0);
    expect(data.limit).toBe(2);
    expect(data.total).toBe(4);
    expect(data.symbols.map((s) => s.ticker)).toEqual(["AAPL", "MSFT"]);

    const page2 = await SELF.fetch(`${BASE}/api/symbols?offset=2&limit=2&sort=ticker`);
    const data2 = await body<{ symbols: Array<{ ticker: string }> }>(page2);
    expect(data2.symbols.map((s) => s.ticker)).toEqual(["NVDA", "TSLA"]);
  });

  it("lists symbols alphabetically by company title", async () => {
    const res = await SELF.fetch(`${BASE}/api/symbols?sort=title&limit=100`);
    const data = await body<{ symbols: Array<{ title: string }>; sort: string }>(res);
    expect(data.sort).toBe("title");
    expect(data.symbols[0]?.title).toBe("Apple Inc.");
    expect(data.symbols.at(-1)?.title).toBe("Tesla, Inc.");
  });

  it("searches by ticker, name, or both", async () => {
    const byTicker = await SELF.fetch(`${BASE}/api/symbols?symbol=nv`);
    const tickerData = await body<{ symbols: Array<{ ticker: string }>; total: number }>(byTicker);
    expect(tickerData.total).toBe(1);
    expect(tickerData.symbols[0]?.ticker).toBe("NVDA");

    const byName = await SELF.fetch(`${BASE}/api/symbols?name=microsoft`);
    const nameData = await body<{ symbols: Array<{ ticker: string }> }>(byName);
    expect(nameData.symbols.map((s) => s.ticker)).toEqual(["MSFT"]);

    const byQuery = await SELF.fetch(`${BASE}/api/symbols?q=tesla`);
    const queryData = await body<{ symbols: Array<{ ticker: string }> }>(byQuery);
    expect(queryData.symbols.map((s) => s.ticker)).toEqual(["TSLA"]);

    const combined = await SELF.fetch(`${BASE}/api/symbols?symbol=a&name=corp`);
    const combinedData = await body<{ symbols: Array<{ ticker: string }> }>(combined);
    expect(combinedData.symbols.map((s) => s.ticker)).toEqual(["NVDA"]);
  });

  it("returns exchange metadata per listing", async () => {
    const res = await SELF.fetch(`${BASE}/api/symbols?symbol=AAPL`);
    const data = await body<{ symbols: Array<Record<string, unknown>> }>(res);
    expect(data.symbols[0]).toEqual({
      ticker: "AAPL",
      exchange: "NASDAQ",
      mic: "XNAS",
      currency: "USD",
      country: "US",
      title: "Apple Inc.",
      isin: null,
      cikStr: 320193,
    });
  });

  it("surfaces cross-market collisions instead of picking one", async () => {
    await seedSymbols(COLLISION_ROWS);

    // A bare query lists every listing with that code, exact-base matches first.
    const res = await SELF.fetch(`${BASE}/api/symbols?q=amp`);
    const data = await body<{ symbols: Array<{ ticker: string; exchange: string; currency: string }> }>(res);
    expect(data.symbols.map((s) => [s.ticker, s.exchange, s.currency])).toEqual([
      ["AMP", "NYSE", "USD"],
      ["AMP.AX", "ASX", "AUD"],
    ]);

    // Suffixed queries are exact to one market.
    const ax = await SELF.fetch(`${BASE}/api/symbols?symbol=amp.ax`);
    expect((await body<{ total: number }>(ax)).total).toBe(1);
  });

  it("filters by exchange code or alias", async () => {
    await seedSymbols(COLLISION_ROWS);

    const nzx = await SELF.fetch(`${BASE}/api/symbols?exchange=nzx`);
    const nzxData = await body<{ symbols: Array<{ ticker: string }>; exchange: string }>(nzx);
    expect(nzxData.exchange).toBe("NZX");
    expect(nzxData.symbols.map((s) => s.ticker)).toEqual(["FPH.NZ"]);

    // "US" spans every US venue (NASDAQ + NYSE rows here).
    const us = await SELF.fetch(`${BASE}/api/symbols?exchange=nasdaq&q=amp`);
    const usData = await body<{ symbols: Array<{ ticker: string }> }>(us);
    expect(usData.symbols.map((s) => s.ticker)).toEqual(["AMP"]);

    const unknown = await SELF.fetch(`${BASE}/api/symbols?exchange=MARS`);
    expect(unknown.status).toBe(400);
  });

  it("rejects invalid paging", async () => {
    const res = await SELF.fetch(`${BASE}/api/symbols?offset=-1`);
    expect(res.status).toBe(400);
  });
});
