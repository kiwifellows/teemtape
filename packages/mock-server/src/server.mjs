// Builds the in-memory mock HTTP server. Exported as a factory so tests can
// start a fresh, isolated instance on an ephemeral port.

import { createServer } from "node:http";
import { randomBytes, randomUUID } from "node:crypto";
import { BASE_QUOTES, COMPANY_NAMES, SEED_SYMBOLS, seedNotes, seedWatchlists } from "./data.mjs";

export const DELAY_SECONDS = 60;

function send(res, status, body) {
  // Mirror the Worker: echo a browser origin (so cookies/credentials work), else "*".
  const origin = res.req?.headers.origin;
  res.writeHead(status, {
    "content-type": "application/json",
    "access-control-allow-origin": origin || "*",
    ...(origin ? { "access-control-allow-credentials": "true", vary: "origin" } : {}),
    "access-control-allow-methods": "GET,POST,OPTIONS",
    "access-control-allow-headers": "content-type,accept,authorization",
  });
  res.end(JSON.stringify(body));
}

/**
 * Simulate the hosted API's optional authorisation hook (docs/authz-contract.md)
 * so clients can exercise link access and roles locally.
 *
 *   MOCK_PRIVATE_TOKENS   comma-separated watchlist tokens treated as private
 *   MOCK_LINK_ACCESS      "token:public-view,token2:public-comment" for other levels
 *   MOCK_ACCESS_TOKEN     bearer token of the list OWNER (default "mock-pat")
 *   MOCK_SESSION_ROLE     role for a browser carrying cookie `mock_session=1`:
 *                         anonymous (default: signed in, not a member), viewer,
 *                         commenter, editor, owner
 *   MOCK_SIGN_IN_URL      returned as `signInUrl` (default http://localhost:5174)
 *   MOCK_LAST_WATCHLIST   token (optionally "token:Name") reported to signed-in
 *                         callers as their most recently saved list, so the web
 *                         app's home page opens it instead of creating one
 *
 * Everything else is anonymous and bound by the link. `whoami` reports
 * `mockuser` for the owner token and `visitor` for the session cookie.
 */
export function createAuthzSim(options = {}) {
  const privateTokens = new Set(
    (options.privateTokens ?? process.env.MOCK_PRIVATE_TOKENS ?? "").split(",").map((t) => t.trim()).filter(Boolean),
  );
  const linkAccessByToken = new Map(
    (options.linkAccess ?? process.env.MOCK_LINK_ACCESS ?? "")
      .split(",")
      .map((pair) => pair.trim().split(":"))
      .filter(([t, a]) => t && a),
  );
  const accessToken = options.accessToken ?? process.env.MOCK_ACCESS_TOKEN ?? "mock-pat";
  const sessionRole = options.sessionRole ?? process.env.MOCK_SESSION_ROLE ?? "anonymous";
  const signInUrl = options.signInUrl ?? process.env.MOCK_SIGN_IN_URL ?? "http://localhost:5174";
  const [lastToken, lastName] = (options.lastWatchlist ?? process.env.MOCK_LAST_WATCHLIST ?? "").split(":");
  const lastWatchlist = lastToken ? { token: lastToken.trim(), name: lastName?.trim() || null } : null;

  const ROLE_GRANTS = {
    owner: ["view", "add_symbol", "post_note", "manage"],
    editor: ["view", "add_symbol", "post_note"],
    commenter: ["view", "post_note"],
    viewer: ["view"],
    anonymous: [],
  };
  const LINK_GRANTS = {
    "public-edit": ["view", "add_symbol", "post_note"],
    "public-comment": ["view", "post_note"],
    "public-view": ["view"],
    private: [],
  };

  const bearer = (req) => {
    const m = (req.headers.authorization ?? "").match(/^Bearer\s+(.+)$/i);
    return m ? m[1].trim() : undefined;
  };
  const hasSession = (req) => /(?:^|;\s*)mock_session=1/.test(req.headers.cookie ?? "");
  const linkAccess = (token) => (privateTokens.has(token) ? "private" : linkAccessByToken.get(token) ?? "public-edit");

  /** { role, user } for the caller. */
  const caller = (req) => {
    const provided = bearer(req);
    if (provided === accessToken) return { role: "owner", user: { handle: "mockuser" } };
    // An unknown bearer token identifies nobody but still counts as a credential
    // (denials are 403 "forbidden" rather than 401 "sign in"), as before.
    if (provided) return { role: "anonymous", user: null, credentialed: true };
    if (hasSession(req)) return { role: sessionRole, user: { handle: "visitor" } };
    return { role: "anonymous", user: null };
  };

  const decide = (req, token) => {
    const { role, user, credentialed } = caller(req);
    const link = linkAccess(token);
    const grants = ["view", "add_symbol", "post_note", "manage"].filter(
      (a) => ROLE_GRANTS[role].includes(a) || LINK_GRANTS[link].includes(a),
    );
    return { role, user, credentialed, linkAccess: link, grants };
  };

  return {
    /** Returns a denial body when the caller may not perform `action`, else undefined. */
    deny(req, token, action = "view") {
      const d = decide(req, token);
      if (d.grants.includes(action)) return undefined;
      return d.user || d.credentialed
        ? { status: 403, body: { error: "you do not have permission to do that on this watchlist", reason: "forbidden", signInUrl } }
        : { status: 401, body: { error: "this watchlist is private — sign in to continue", reason: "sign_in_required", signInUrl } };
    },
    /** The `access` block returned with GET /api/w/:token. */
    access(req, token) {
      const d = decide(req, token);
      return {
        role: d.role,
        linkAccess: d.linkAccess,
        can: { addSymbol: d.grants.includes("add_symbol"), postNote: d.grants.includes("post_note"), manage: d.grants.includes("manage") },
        user: d.user,
      };
    },
    /** `GET /api/whoami`: who the caller is, and where they were last. */
    whoami(req) {
      const user = caller(req).user;
      return { user, lastWatchlist: user ? lastWatchlist : null };
    },
  };
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
export function createMockServer(options = {}) {
  const watchlists = seedWatchlists();
  const notes = seedNotes();
  const handles = new Set();
  const authz = createAuthzSim(options.authz);

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

    // GET /api/symbols?q=&symbol=&name=&exchange=&offset=&limit=&sort= — same contract as the Worker.
    if (path === "/api/symbols" && method === "GET") {
      const like = (value, term) => !term || value.toLowerCase().includes(term.toLowerCase());
      const q = url.searchParams.get("q") ?? "";
      const symbol = url.searchParams.get("symbol") ?? "";
      const name = url.searchParams.get("name") ?? "";
      const exchange = (url.searchParams.get("exchange") ?? "").toUpperCase();
      const sort = url.searchParams.get("sort") === "title" ? "title" : "ticker";
      const offset = Number(url.searchParams.get("offset") ?? 0);
      const limit = Math.min(Number(url.searchParams.get("limit") ?? 100), 100);
      const exact = (symbol || q).trim().toUpperCase();
      const matched = SEED_SYMBOLS.filter(
        (s) =>
          (like(s.ticker, q) || like(s.title, q)) &&
          like(s.ticker, symbol) &&
          like(s.title, name) &&
          (!exchange || s.exchange === exchange || (exchange === "US" && s.country === "US")),
      ).sort((a, b) => {
        // Exact base matches first so "AMP" shows both AMP and AMP.AX at the top.
        const rank = (s) => (s.ticker.split(".")[0] === exact ? 0 : 1);
        return rank(a) - rank(b) || (sort === "title" ? a.title.localeCompare(b.title) : a.ticker.localeCompare(b.ticker));
      });
      return send(res, 200, { symbols: matched.slice(offset, offset + limit), offset, limit, total: matched.length, sort, ...(exchange ? { exchange } : {}) });
    }

    if (path === "/api/whoami" && method === "GET") {
      return send(res, 200, authz.whoami(req));
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
      const action = method === "GET" ? "view" : sub === "/symbols" ? "add_symbol" : sub === "/notes" ? "post_note" : "view";
      const denied = authz.deny(req, token, action);
      if (denied) return send(res, denied.status, denied.body);
      const watchlist = watchlists.get(token);
      if (!watchlist) return send(res, 404, { error: "unknown watchlist token" });

      if (!sub && method === "GET") return send(res, 200, { ...watchlist, access: authz.access(req, token) });

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
