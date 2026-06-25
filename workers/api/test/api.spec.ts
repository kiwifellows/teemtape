import { SELF } from "cloudflare:test";
import { describe, expect, it } from "vitest";

const BASE = "https://api.test";

async function post(path: string, body?: unknown) {
  return SELF.fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

async function body<T>(res: Response): Promise<T> {
  return (await res.json()) as T;
}

describe("teemtape API", () => {
  it("reports health", async () => {
    const res = await SELF.fetch(`${BASE}/health`);
    expect(res.status).toBe(200);
    const data = await body<{ ok: boolean; delayedSeconds: number }>(res);
    expect(data.ok).toBe(true);
    expect(data.delayedSeconds).toBe(60);
  });

  it("returns delayed sample quotes", async () => {
    const res = await SELF.fetch(`${BASE}/api/quotes?symbols=AAPL,nvda`);
    expect(res.status).toBe(200);
    const data = await body<{ quotes: Array<{ symbol: string }>; source: string; delayedSeconds: number }>(res);
    expect(data.source).toBe("sample");
    expect(data.delayedSeconds).toBe(60);
    expect(data.quotes.map((q) => q.symbol)).toEqual(["AAPL", "NVDA"]);
  });

  it("rejects an empty symbols query", async () => {
    const res = await SELF.fetch(`${BASE}/api/quotes`);
    expect(res.status).toBe(400);
  });

  it("creates a watchlist, adds symbols, and round-trips notes", async () => {
    // create
    const created = await post("/api/watchlists");
    expect(created.status).toBe(201);
    const { token } = await body<{ token: string }>(created);
    expect(token).toMatch(/^[0-9a-f]{32}$/);

    // add symbol (idempotent, normalized to upper-case)
    await post(`/api/w/${token}/symbols`, { symbol: "nvda" });
    const dup = await post(`/api/w/${token}/symbols`, { symbol: "NVDA" });
    const wl = await body<{ symbols: string[] }>(dup);
    expect(wl.symbols).toEqual(["NVDA"]);

    // notes start empty
    const empty = await SELF.fetch(`${BASE}/api/w/${token}/notes?symbol=NVDA`);
    expect((await body<{ notes: unknown[] }>(empty)).notes).toEqual([]);

    // cli note -> attributed to agent-cli
    const cli = await post(`/api/w/${token}/notes`, { symbol: "NVDA", body: "from cli", source: "cli" });
    expect(cli.status).toBe(201);
    expect(await body<{ author: string; source: string }>(cli)).toMatchObject({
      author: "agent-cli",
      source: "cli",
    });

    // web note -> anonymous handle derived from token
    const web = await post(`/api/w/${token}/notes`, { symbol: "NVDA", body: "from web" });
    expect((await body<{ author: string }>(web)).author).toBe(`anon-${token.slice(0, 6)}`);

    // both notes are returned, newest first
    const after = await SELF.fetch(`${BASE}/api/w/${token}/notes?symbol=NVDA`);
    const notes = (await body<{ notes: Array<{ body: string }> }>(after)).notes;
    expect(notes.map((n) => n.body)).toEqual(["from web", "from cli"]);
  });

  it("generates, claims, and de-dupes anonymous handles", async () => {
    // auto-generate a unique handle
    const gen = await post("/api/handles");
    expect(gen.status).toBe(201);
    const { handle } = await body<{ handle: string }>(gen);
    expect(handle).toMatch(/^user\d{4}$/);

    // claiming the same handle again conflicts
    const dup = await post("/api/handles", { handle });
    expect(dup.status).toBe(409);

    // a specific, free handle can be claimed (and is lower-cased)
    const claim = await post("/api/handles", { handle: "Trader_Jane" });
    expect(claim.status).toBe(201);
    expect((await body<{ handle: string }>(claim)).handle).toBe("trader_jane");

    // availability check reflects what's been claimed
    const taken = await SELF.fetch(`${BASE}/api/handles/trader_jane`);
    expect((await body<{ available: boolean }>(taken)).available).toBe(false);
    const free = await SELF.fetch(`${BASE}/api/handles/somebody_new`);
    expect((await body<{ available: boolean }>(free)).available).toBe(true);

    // invalid handles are rejected
    const bad = await post("/api/handles", { handle: "no" });
    expect(bad.status).toBe(400);
  });

  it("attributes a note to the supplied handle", async () => {
    const created = await post("/api/watchlists");
    const { token } = await body<{ token: string }>(created);

    const res = await post(`/api/w/${token}/notes`, {
      symbol: "AAPL",
      body: "handle note",
      source: "web",
      handle: "MoonWatcher",
    });
    expect(res.status).toBe(201);
    expect((await body<{ author: string }>(res)).author).toBe("moonwatcher");

    // the handle is reserved once it has authored a note
    const avail = await SELF.fetch(`${BASE}/api/handles/moonwatcher`);
    expect((await body<{ available: boolean }>(avail)).available).toBe(false);
  });

  it("404s an unknown watchlist token", async () => {
    const res = await SELF.fetch(`${BASE}/api/w/${"a".repeat(32)}`);
    expect(res.status).toBe(404);
  });

  it("returns an agent aggregate payload with stocks and comments", async () => {
    const created = await post("/api/watchlists");
    const { token } = await body<{ token: string }>(created);

    await post(`/api/w/${token}/symbols`, { symbol: "NVDA" });
    await post(`/api/w/${token}/symbols`, { symbol: "AAPL" });
    await post(`/api/w/${token}/notes`, { symbol: "NVDA", body: "nvda note", source: "cli" });
    await post(`/api/w/${token}/notes`, { symbol: "AAPL", body: "aapl note", source: "web" });

    const res = await SELF.fetch(`${BASE}/api/w/${token}/agent`);
    expect(res.status).toBe(200);

    const data = await body<{
      watchlist: { symbols: string[] };
      stocks: Array<{ ticker: string; comments: Array<{ body: string }> }>;
    }>(res);
    expect(data.watchlist.symbols).toEqual(["NVDA", "AAPL"]);
    expect(data.stocks).toHaveLength(2);
    expect(data.stocks.find((s) => s.ticker === "NVDA")?.comments[0]?.body).toBe("nvda note");
    expect(data.stocks.find((s) => s.ticker === "AAPL")?.comments[0]?.body).toBe("aapl note");
  });

  it("400s an invalid symbol", async () => {
    const created = await post("/api/watchlists");
    const { token } = await body<{ token: string }>(created);
    const res = await post(`/api/w/${token}/symbols`, { symbol: "not a symbol!!" });
    expect(res.status).toBe(400);
  });
});
