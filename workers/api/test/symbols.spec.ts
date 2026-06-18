import { env, SELF } from "cloudflare:test";
import { beforeEach, describe, expect, it } from "vitest";

const BASE = "https://api.test";
const SYNCED_AT = "2026-01-01T00:00:00.000Z";

async function body<T>(res: Response): Promise<T> {
  return (await res.json()) as T;
}

async function seedSymbols(): Promise<void> {
  const rows = [
    ["AAPL", 320193, "Apple Inc."],
    ["MSFT", 789019, "MICROSOFT CORP"],
    ["NVDA", 1045810, "NVIDIA CORP"],
    ["TSLA", 1318605, "Tesla, Inc."],
  ] as const;

  for (const [ticker, cik, title] of rows) {
    await env.DB.prepare(
      "INSERT INTO symbols (ticker, cik_str, title, synced_at) VALUES (?, ?, ?, ?)",
    )
      .bind(ticker, cik, title, SYNCED_AT)
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

  it("rejects invalid paging", async () => {
    const res = await SELF.fetch(`${BASE}/api/symbols?offset=-1`);
    expect(res.status).toBe(400);
  });
});
