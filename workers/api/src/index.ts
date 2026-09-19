import { authorize, identify, notifyCreated, toWatchlistAccess } from "./authz.js";
import type { Env } from "./env.js";
import { applyCors, cachedJson, error, HttpError, json, noContent } from "./http.js";
import { getQuotes } from "./quotes.js";
import { checkApiKey, checkRateLimit } from "./rate-limit.js";
import {
  addNote,
  addSymbol,
  checkHandle,
  createHandle,
  createWatchlist,
  getAgentWatchlist,
  getNotes,
  getWatchlist,
} from "./repo.js";
import { listSymbolsCatalog } from "./symbols.js";
import {
  parseAgentSymbolLimit,
  parseExchangeFilter,
  parseHandle,
  parseNoteBody,
  parseOptionalHandle,
  parseOptionalSearch,
  parseSource,
  parseSymbol,
  parseSymbolList,
  parseSymbolsPagination,
  parseSymbolsSort,
  parseToken,
} from "./validation.js";

async function readJson(request: Request): Promise<Record<string, unknown>> {
  const text = await request.text();
  if (!text.trim()) return {};
  try {
    const data = JSON.parse(text);
    return typeof data === "object" && data !== null ? (data as Record<string, unknown>) : {};
  } catch {
    throw new HttpError(400, "invalid JSON body");
  }
}

/** Edge-cache lifetime for catalog responses: the data changes fortnightly. */
const SYMBOLS_MAX_AGE_SECONDS = 3600;

async function route(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method;

  // CORS preflight — bypass all guards.
  if (method === "OPTIONS") return noContent();

  // Health check — bypass rate limiting and auth so load balancers can probe freely.
  if (path === "/" || path === "/health") {
    return json({ ok: true, service: "teemtape-api", delayedSeconds: Number(env.QUOTE_DELAY_SECONDS ?? "60") });
  }

  // API-key guard (optional — only active when API_KEY secret is configured).
  checkApiKey(request, env);

  // IP-based rate limiting (60 req/min by default; 0 = disabled).
  await checkRateLimit(request, env);

  // GET /api/quotes?symbols=AAPL,MSFT
  // Quotes are ~QUOTE_DELAY_SECONDS stale by design, so an edge cache of the
  // same length is invisible to callers while a hit skips KV and providers.
  if (path === "/api/quotes" && method === "GET") {
    const symbols = parseSymbolList(url.searchParams.get("symbols"));
    const maxAge = Number(env.QUOTE_DELAY_SECONDS ?? "60");
    const key = new Request(`${url.origin}/api/quotes?symbols=${symbols.join(",")}`);
    return cachedJson(ctx, key, maxAge, () => getQuotes(env, symbols));
  }

  // GET /api/symbols?offset=0&limit=100&sort=ticker|title&q=&symbol=&name=&exchange=
  if (path === "/api/symbols" && method === "GET") {
    const { offset, limit } = parseSymbolsPagination(url.searchParams);
    const params = {
      offset,
      limit,
      sort: parseSymbolsSort(url.searchParams.get("sort")),
      exchange: parseExchangeFilter(url.searchParams.get("exchange")),
      q: parseOptionalSearch(url.searchParams.get("q")),
      symbol: parseOptionalSearch(url.searchParams.get("symbol"), 20),
      name: parseOptionalSearch(url.searchParams.get("name")),
    };
    const canonical = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) if (v !== undefined) canonical.set(k, String(v));
    const key = new Request(`${url.origin}/api/symbols?${canonical}`);
    return cachedJson(ctx, key, SYMBOLS_MAX_AGE_SECONDS, () => listSymbolsCatalog(env, ctx, params));
  }

  // POST /api/watchlists
  if (path === "/api/watchlists" && method === "POST") {
    const watchlist = await createWatchlist(env);
    // Let the (optional) authorisation service record ownership for signed-in callers.
    ctx.waitUntil(notifyCreated(request, env, watchlist.token));
    return json(watchlist, 201);
  }

  // GET /api/whoami — who is the caller, according to the (optional) authorisation service.
  if (path === "/api/whoami" && method === "GET") {
    return json({ user: await identify(request, env) });
  }

  // POST /api/handles — claim a handle (body.handle) or generate a unique one.
  if (path === "/api/handles" && method === "POST") {
    const body = await readJson(request);
    const requested = parseOptionalHandle(body.handle);
    return json(await createHandle(env, requested), 201);
  }

  // GET /api/handles/:handle — check availability of a specific handle.
  const handleMatch = path.match(/^\/api\/handles\/([^/]+)$/);
  if (handleMatch && method === "GET") {
    const handle = parseHandle(decodeURIComponent(handleMatch[1]!));
    return json(await checkHandle(env, handle));
  }

  // /api/w/:token[/symbols|/notes|/agent]
  const match = path.match(/^\/api\/w\/([^/]+)(\/symbols|\/notes|\/agent)?$/);
  if (match) {
    const token = parseToken(match[1]!);
    const sub = match[2];

    if (!sub && method === "GET") {
      const decision = await authorize(request, env, token, "view");
      return json({ ...(await getWatchlist(env, token)), access: toWatchlistAccess(decision) });
    }

    if (sub === "/agent" && method === "GET") {
      await authorize(request, env, token, "view");
      return json(await getAgentWatchlist(env, token, parseAgentSymbolLimit(url.searchParams)));
    }

    if (sub === "/symbols" && method === "POST") {
      await authorize(request, env, token, "add_symbol");
      const body = await readJson(request);
      const symbol = parseSymbol(body.symbol);
      return json(await addSymbol(env, token, symbol));
    }

    if (sub === "/notes" && method === "GET") {
      await authorize(request, env, token, "view");
      const symbol = parseSymbol(url.searchParams.get("symbol"));
      return json({ symbol, notes: await getNotes(env, token, symbol) });
    }

    if (sub === "/notes" && method === "POST") {
      await authorize(request, env, token, "post_note");
      const body = await readJson(request);
      const symbol = parseSymbol(body.symbol);
      const note = await addNote(env, token, {
        symbol,
        body: parseNoteBody(body.body),
        source: parseSource(body.source),
        handle: parseOptionalHandle(body.handle),
      });
      return json(note, 201);
    }
  }

  return error(`not found: ${method} ${path}`, 404);
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    let response: Response;
    try {
      response = await route(request, env, ctx);
    } catch (err) {
      if (err instanceof HttpError) {
        response = error(err.message, err.status, err.extraHeaders, err.extraBody);
      } else {
        console.error("unhandled error", err);
        response = error("internal error", 500);
      }
    }
    return applyCors(response, request, env.CORS_ORIGINS);
  },
} satisfies ExportedHandler<Env>;
