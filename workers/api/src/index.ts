import { authorize, identify, notifyCreated } from "./authz.js";
import type { Env } from "./env.js";
import { applyCors, error, HttpError, json, noContent } from "./http.js";
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
import { syncSymbols } from "./sync.js";
import {
  parseAgentSymbolLimit,
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
  if (path === "/api/quotes" && method === "GET") {
    const symbols = parseSymbolList(url.searchParams.get("symbols"));
    return json(await getQuotes(env, symbols));
  }

  // GET /api/symbols?offset=0&limit=100&sort=ticker|title&q=&symbol=&name=
  if (path === "/api/symbols" && method === "GET") {
    const { offset, limit } = parseSymbolsPagination(url.searchParams);
    return json(
      await listSymbolsCatalog(env, {
        offset,
        limit,
        sort: parseSymbolsSort(url.searchParams.get("sort")),
        q: parseOptionalSearch(url.searchParams.get("q")),
        symbol: parseOptionalSearch(url.searchParams.get("symbol"), 20),
        name: parseOptionalSearch(url.searchParams.get("name")),
      }),
    );
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
      await authorize(request, env, token, "view");
      return json(await getWatchlist(env, token));
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

  async scheduled(_controller: ScheduledController, env: Env): Promise<void> {
    try {
      const result = await syncSymbols(env);
      console.log("symbols sync complete", result);
    } catch (err) {
      console.error("symbols sync failed", err);
      throw err;
    }
  },
} satisfies ExportedHandler<Env>;
