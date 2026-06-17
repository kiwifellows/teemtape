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

  it("404s an unknown watchlist token", async () => {
    const res = await SELF.fetch(`${BASE}/api/w/${"a".repeat(32)}`);
    expect(res.status).toBe(404);
  });

  it("400s an invalid symbol", async () => {
    const created = await post("/api/watchlists");
    const { token } = await body<{ token: string }>(created);
    const res = await post(`/api/w/${token}/symbols`, { symbol: "not a symbol!!" });
    expect(res.status).toBe(400);
  });
});
