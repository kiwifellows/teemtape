import test from "node:test";
import assert from "node:assert/strict";
import { once } from "node:events";
import { createMockServer } from "../../mock-server/src/server.mjs";
import { TeemtapeClient, ApiError } from "../dist/index.js";

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
