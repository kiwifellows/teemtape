import type { Env } from "./env.js";
import { error, HttpError, json, noContent } from "./http.js";
import { getQuotes } from "./quotes.js";
import { addNote, addSymbol, createWatchlist, getNotes, getWatchlist } from "./repo.js";
import { parseNoteBody, parseSource, parseSymbol, parseSymbolList, parseToken } from "./validation.js";

async function readJson(request: Request): Promise<Record<string, unknown>> {
  try {
    const data = await request.json();
    return typeof data === "object" && data !== null ? (data as Record<string, unknown>) : {};
  } catch {
    throw new HttpError(400, "invalid JSON body");
  }
}

async function route(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method;

  if (method === "OPTIONS") return noContent();

  if (path === "/" || path === "/health") {
    return json({ ok: true, service: "teemtape-api", delayedSeconds: Number(env.QUOTE_DELAY_SECONDS ?? "60") });
  }

  // GET /api/quotes?symbols=AAPL,MSFT
  if (path === "/api/quotes" && method === "GET") {
    const symbols = parseSymbolList(url.searchParams.get("symbols"));
    return json(await getQuotes(env, symbols));
  }

  // POST /api/watchlists
  if (path === "/api/watchlists" && method === "POST") {
    return json(await createWatchlist(env), 201);
  }

  // /api/w/:token[/symbols|/notes]
  const match = path.match(/^\/api\/w\/([^/]+)(\/symbols|\/notes)?$/);
  if (match) {
    const token = parseToken(match[1]!);
    const sub = match[2];

    if (!sub && method === "GET") {
      return json(await getWatchlist(env, token));
    }

    if (sub === "/symbols" && method === "POST") {
      const body = await readJson(request);
      const symbol = parseSymbol(body.symbol);
      return json(await addSymbol(env, token, symbol));
    }

    if (sub === "/notes" && method === "GET") {
      const symbol = parseSymbol(url.searchParams.get("symbol"));
      return json({ symbol, notes: await getNotes(env, token, symbol) });
    }

    if (sub === "/notes" && method === "POST") {
      const body = await readJson(request);
      const symbol = parseSymbol(body.symbol);
      const note = await addNote(env, token, {
        symbol,
        body: parseNoteBody(body.body),
        source: parseSource(body.source),
      });
      return json(note, 201);
    }
  }

  return error(`not found: ${method} ${path}`, 404);
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    try {
      return await route(request, env);
    } catch (err) {
      if (err instanceof HttpError) return error(err.message, err.status);
      console.error("unhandled error", err);
      return error("internal error", 500);
    }
  },
} satisfies ExportedHandler<Env>;
