// Builds the in-memory mock HTTP server. Exported as a factory so tests can
// start a fresh, isolated instance on an ephemeral port.

import { createServer } from "node:http";
import { randomBytes, randomUUID } from "node:crypto";
import { BASE_QUOTES, COMPANY_NAMES, seedNotes, seedWatchlists } from "./data.mjs";

export const DELAY_SECONDS = 60;

function send(res, status, body) {
  res.writeHead(status, {
    "content-type": "application/json",
    "access-control-allow-origin": "*",
    "access-control-allow-methods": "GET,POST,OPTIONS",
    "access-control-allow-headers": "content-type,accept",
  });
  res.end(JSON.stringify(body));
}

async function readJson(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  if (chunks.length === 0) return {};
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    return null;
  }
}

function quoteFor(symbol) {
  const sym = symbol.toUpperCase();
  const base = BASE_QUOTES[sym];
  const asOf = new Date(Date.now() - DELAY_SECONDS * 1000).toISOString();
  if (base) {
    return { symbol: sym, name: COMPANY_NAMES[sym] ?? sym, ...base, asOf };
  }
  const seed = [...sym].reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  const price = 50 + (seed % 400) + 0.5;
  const change = ((seed % 7) - 3) * 0.5;
  return {
    symbol: sym,
    name: `${sym} (mock)`,
    price,
    change,
    pct: Number(((change / price) * 100).toFixed(2)),
    asOf,
  };
}

const HANDLE_RE = /^[a-z][a-z0-9_-]{2,19}$/;

function normalizeHandle(raw) {
  return typeof raw === "string" ? raw.trim().toLowerCase() : "";
}

function suggestHandle() {
  return `user${1000 + Math.floor(Math.random() * 9000)}`;
}

/** Create a fresh mock server (not yet listening) with its own seeded state. */
export function createMockServer() {
  const watchlists = seedWatchlists();
  const notes = seedNotes();
  const handles = new Set();

  return createServer(async (req, res) => {
    const url = new URL(req.url ?? "/", "http://localhost");
    const path = url.pathname;
    const method = req.method ?? "GET";

    if (method === "OPTIONS") return send(res, 204, {});

    if (path === "/" || path === "/health") {
      return send(res, 200, { ok: true, service: "teemtape-mock", delayedSeconds: DELAY_SECONDS });
    }

    if (path === "/api/quotes" && method === "GET") {
      const raw = url.searchParams.get("symbols") ?? "";
      const symbols = raw.split(",").map((s) => s.trim()).filter(Boolean);
      if (symbols.length === 0) return send(res, 400, { error: "symbols query param is required" });
      return send(res, 200, { quotes: symbols.map(quoteFor), delayedSeconds: DELAY_SECONDS, source: "mock" });
    }

    if (path === "/api/watchlists" && method === "POST") {
      const token = randomBytes(16).toString("hex");
      const watchlist = { token, symbols: [], createdAt: new Date().toISOString() };
      watchlists.set(token, watchlist);
      return send(res, 201, watchlist);
    }

    if (path === "/api/handles" && method === "POST") {
      const body = await readJson(req);
      if (body === null) return send(res, 400, { error: "invalid JSON body" });
      const requested = normalizeHandle(body.handle);
      if (requested) {
        if (!HANDLE_RE.test(requested)) return send(res, 400, { error: `invalid handle: ${body.handle}` });
        if (handles.has(requested)) return send(res, 409, { error: `handle already taken: ${requested}` });
        handles.add(requested);
        return send(res, 201, { handle: requested, createdAt: new Date().toISOString() });
      }
      let candidate = suggestHandle();
      while (handles.has(candidate)) candidate = suggestHandle();
      handles.add(candidate);
      return send(res, 201, { handle: candidate, createdAt: new Date().toISOString() });
    }

    const handleMatch = path.match(/^\/api\/handles\/([^/]+)$/);
    if (handleMatch && method === "GET") {
      const handle = normalizeHandle(decodeURIComponent(handleMatch[1]));
      if (!HANDLE_RE.test(handle)) return send(res, 400, { error: `invalid handle: ${handle}` });
      return send(res, 200, { handle, available: !handles.has(handle) });
    }

    const wMatch = path.match(/^\/api\/w\/([^/]+)(\/symbols|\/notes|\/agent)?$/);
    if (wMatch) {
      const token = wMatch[1];
      const sub = wMatch[2];
      const watchlist = watchlists.get(token);
      if (!watchlist) return send(res, 404, { error: "unknown watchlist token" });

      if (!sub && method === "GET") return send(res, 200, watchlist);

      if (sub === "/agent" && method === "GET") {
        const limit = Math.min(
          50,
          Math.max(1, Number(url.searchParams.get("limit") ?? "50") || 50),
        );
        const symbols = watchlist.symbols.slice(0, limit);
        const stocks = symbols.map((symbol) => {
          const thread = notes
            .filter((n) => n.token === token && n.symbol === symbol)
            .map(({ token: _t, ...rest }) => rest)
            .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
          return { ticker: symbol, comments: thread };
        });
        const payload = { watchlist, stocks };
        if (watchlist.symbols.length > limit) {
          payload.truncated = true;
          payload.totalSymbols = watchlist.symbols.length;
          payload.symbolLimit = limit;
        }
        return send(res, 200, payload);
      }

      if (sub === "/symbols" && method === "POST") {
        const body = await readJson(req);
        if (!body || typeof body.symbol !== "string" || !body.symbol.trim()) {
          return send(res, 400, { error: "symbol is required" });
        }
        const symbol = body.symbol.trim().toUpperCase();
        if (!watchlist.symbols.includes(symbol)) watchlist.symbols.push(symbol);
        return send(res, 200, watchlist);
      }

      if (sub === "/notes" && method === "GET") {
        const symbol = (url.searchParams.get("symbol") ?? "").trim().toUpperCase();
        if (!symbol) return send(res, 400, { error: "symbol query param is required" });
        const thread = notes
          .filter((n) => n.token === token && n.symbol === symbol)
          .map(({ token: _t, ...rest }) => rest)
          .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
        return send(res, 200, { symbol, notes: thread });
      }

      if (sub === "/notes" && method === "POST") {
        const body = await readJson(req);
        if (!body || typeof body.symbol !== "string" || typeof body.body !== "string" || !body.body.trim()) {
          return send(res, 400, { error: "symbol and body are required" });
        }
        const source = body.source === "cli" ? "cli" : "web";
        const handle = normalizeHandle(body.handle);
        if (handle && !HANDLE_RE.test(handle)) {
          return send(res, 400, { error: `invalid handle: ${body.handle}` });
        }
        if (handle) handles.add(handle);
        const author = handle || (source === "cli" ? "agent-cli" : `anon-${randomBytes(3).toString("hex")}`);
        const note = {
          id: randomUUID().slice(0, 8),
          symbol: body.symbol.trim().toUpperCase(),
          author,
          source,
          body: body.body.trim(),
          createdAt: new Date().toISOString(),
        };
        notes.push({ token, ...note });
        return send(res, 201, note);
      }
    }

    return send(res, 404, { error: `not found: ${method} ${path}` });
  });
}
