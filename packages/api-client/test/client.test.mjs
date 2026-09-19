import test from "node:test";
import assert from "node:assert/strict";
import { once } from "node:events";
import { createMockServer } from "../../mock-server/src/server.mjs";
import { TeemtapeClient, ApiError, findMarket, normalizeSymbol, splitSymbol } from "../dist/index.js";

test("client round-trips against the mock API", async (t) => {
  const server = createMockServer();
  server.listen(0);
  await once(server, "listening");
  const { port } = server.address();
  const baseUrl = `http://localhost:${port}`;
  t.after(() => server.close());

  // delayed quotes
  const anon = new TeemtapeClient({ baseUrl });
  const quotes = await anon.getQuotes(["AAPL", "MSFT"]);
  assert.equal(quotes.source, "mock");
  assert.equal(quotes.delayedSeconds, 60);
  assert.equal(quotes.quotes.length, 2);
  assert.equal(quotes.quotes[0].symbol, "AAPL");

  // create watchlist (anonymous md5-shaped token) + add a symbol
  const created = await anon.createWatchlist();
  assert.match(created.token, /^[0-9a-f]{32}$/);
  const scoped = new TeemtapeClient({ baseUrl, token: created.token });
  const wl = await scoped.addSymbol("nvda");
  assert.deepEqual(wl.symbols, ["NVDA"]);

  // notes round-trip; cli notes are attributed to agent-cli
  assert.equal((await scoped.getNotes("NVDA")).notes.length, 0);
  const note = await scoped.addNote({ symbol: "nvda", body: "hello from cli", source: "cli" });
  assert.equal(note.author, "agent-cli");
  assert.equal(note.source, "cli");
  const after = await scoped.getNotes("NVDA");
  assert.equal(after.notes.length, 1);
  assert.equal(after.notes[0].body, "hello from cli");
});

test("client searches the multi-market catalog and normalises symbol helpers", async (t) => {
  const server = createMockServer();
  server.listen(0);
  await once(server, "listening");
  const baseUrl = `http://localhost:${server.address().port}`;
  t.after(() => server.close());

  const client = new TeemtapeClient({ baseUrl });
  const amp = await client.listSymbols({ q: "amp" });
  assert.deepEqual(
    amp.symbols.map((s) => s.ticker),
    ["AMP", "AMP.AX"],
  );
  const asx = await client.listSymbols({ q: "amp", exchange: "ASX" });
  assert.deepEqual(asx.symbols.map((s) => [s.ticker, s.currency]), [["AMP.AX", "AUD"]]);

  // EXCHANGE:TICKER aliases collapse to canonical symbols; US stays bare.
  assert.equal(normalizeSymbol("asx:bhp"), "BHP.AX");
  assert.equal(normalizeSymbol("NZX:FPH"), "FPH.NZ");
  assert.equal(normalizeSymbol("nasdaq:aapl"), "AAPL");
  assert.equal(normalizeSymbol("bhp.ax"), "BHP.AX");
  assert.deepEqual(splitSymbol("0700.HK").market.code, "HKEX");
  assert.equal(splitSymbol("BRK.B").suffix, "", "US class shares are not a market suffix");
  assert.equal(findMarket("tyo").suffix, "T");
});

test("client claims handles and attributes notes to them", async (t) => {
  const server = createMockServer();
  server.listen(0);
  await once(server, "listening");
  const { port } = server.address();
  const baseUrl = `http://localhost:${port}`;
  t.after(() => server.close());

  const client = new TeemtapeClient({ baseUrl });

  // auto-generated handle
  const generated = await client.createHandle();
  assert.match(generated.handle, /^user\d{4}$/);

  // claim a specific handle, then a duplicate conflicts
  const claimed = await client.createHandle("trader_jane");
  assert.equal(claimed.handle, "trader_jane");
  assert.equal((await client.checkHandle("trader_jane")).available, false);
  await assert.rejects(
    () => client.createHandle("trader_jane"),
    (err) => err instanceof ApiError && err.status === 409,
  );

  // notes carry the handle as the author
  const created = await client.createWatchlist();
  const scoped = new TeemtapeClient({ baseUrl, token: created.token });
  const note = await scoped.addNote({ symbol: "AAPL", body: "hi", source: "web", handle: "trader_jane" });
  assert.equal(note.author, "trader_jane");
});

test("client surfaces API errors and missing-token errors", async (t) => {
  const server = createMockServer();
  server.listen(0);
  await once(server, "listening");
  const { port } = server.address();
  const baseUrl = `http://localhost:${port}`;
  t.after(() => server.close());

  const bad = new TeemtapeClient({ baseUrl, token: "does-not-exist" });
  await assert.rejects(
    () => bad.getWatchlist(),
    (err) => err instanceof ApiError && err.status === 404,
  );

  const noToken = new TeemtapeClient({ baseUrl });
  await assert.rejects(() => noToken.getWatchlist(), /token is required/);
});

test("client sends a bearer access token and surfaces authorisation denials", async (t) => {
  const seeded = "6f1ed002ab5595859014ebf0951522d9";
  const server = createMockServer({ authz: { privateTokens: seeded, accessToken: "pat-1", signInUrl: "https://app.test" } });
  server.listen(0);
  await once(server, "listening");
  const baseUrl = `http://localhost:${server.address().port}`;
  t.after(() => server.close());

  // anonymous → 401 sign_in_required with a sign-in URL
  const anon = new TeemtapeClient({ baseUrl, token: seeded });
  await assert.rejects(anon.getWatchlist(), (err) => {
    assert.ok(err instanceof ApiError);
    assert.equal(err.status, 401);
    assert.equal(err.accessDenied, true);
    assert.equal(err.reason, "sign_in_required");
    assert.equal(err.signInUrl, "https://app.test");
    return true;
  });
  assert.deepEqual(await anon.whoami(), { user: null });

  // wrong token → 403 forbidden
  const wrong = new TeemtapeClient({ baseUrl, token: seeded, accessToken: "nope" });
  await assert.rejects(wrong.getWatchlist(), (err) => err.status === 403 && err.reason === "forbidden");

  // right token → through, and whoami knows us
  const ok = new TeemtapeClient({ baseUrl, token: seeded, accessToken: "pat-1" });
  assert.equal((await ok.getWatchlist()).token, seeded);
  assert.deepEqual(await ok.whoami(), { user: { handle: "mockuser" } });

  // a plain 404 is not an access denial
  await assert.rejects(new TeemtapeClient({ baseUrl, token: "0".repeat(32) }).getWatchlist(), (err) => {
    assert.equal(err.status, 404);
    assert.equal(err.accessDenied, false);
    assert.equal(err.reason, undefined);
    return true;
  });
});
