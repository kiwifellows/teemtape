import { env } from "cloudflare:test";
import { afterEach, describe, expect, it, vi } from "vitest";
import { syncSymbols } from "../src/sync.js";

const SEC_PAYLOAD = {
  "0": { cik_str: 1045810, ticker: "NVDA", title: "NVIDIA CORP" },
  "1": { cik_str: 320193, ticker: "AAPL", title: "Apple Inc." },
};

describe("symbols sync", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("upserts SEC tickers and removes stale rows", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify(SEC_PAYLOAD), { status: 200 })),
    );

    const first = await syncSymbols(env);
    expect(first).toEqual({ upserted: 2, deleted: 0 });

    const rows = await env.DB.prepare(
      "SELECT ticker, cik_str, title FROM symbols ORDER BY ticker",
    ).all<{ ticker: string; cik_str: number; title: string }>();

    expect(rows.results).toEqual([
      { ticker: "AAPL", cik_str: 320193, title: "Apple Inc." },
      { ticker: "NVDA", cik_str: 1045810, title: "NVIDIA CORP" },
    ]);

    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify({ "0": SEC_PAYLOAD["1"] }), { status: 200 })),
    );

    const second = await syncSymbols(env);
    expect(second).toEqual({ upserted: 1, deleted: 1 });

    const after = await env.DB.prepare("SELECT ticker FROM symbols").all<{ ticker: string }>();
    expect(after.results?.map((r) => r.ticker)).toEqual(["AAPL"]);
  });
});
