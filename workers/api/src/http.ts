const CORS_HEADERS: Record<string, string> = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET,POST,OPTIONS",
  "access-control-allow-headers": "content-type,accept,x-api-key,authorization",
};

export function json(data: unknown, status = 200, extraHeaders?: Record<string, string>): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json", ...CORS_HEADERS, ...extraHeaders },
  });
}

/**
 * A JSON response served through the edge Cache API for `maxAge` seconds
 * (0 = no caching, sent with `no-store`). `key` must be a canonical request
 * for the data — build it from the *parsed* inputs so equivalent spellings
 * of a query share one entry. Cache API operations are free and per data
 * centre; the `cache-control` header also lets browsers and polling agents
 * reuse the body without a round trip.
 */
export async function cachedJson(
  ctx: ExecutionContext,
  key: Request,
  maxAge: number,
  produce: () => Promise<unknown>,
): Promise<Response> {
  if (!(maxAge > 0)) return json(await produce(), 200, { "cache-control": "no-store" });

  const hit = await caches.default.match(key);
  if (hit) return hit;

  const response = json(await produce(), 200, { "cache-control": `public, max-age=${maxAge}` });
  ctx.waitUntil(caches.default.put(key, response.clone()));
  return response;
}

export function error(
  message: string,
  status = 400,
  extraHeaders?: Record<string, string>,
  extraBody?: Record<string, unknown>,
): Response {
  return json({ error: message, ...extraBody }, status, extraHeaders);
}

export function noContent(): Response {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

/**
 * Apply per-request CORS. Browsers refuse to send cookies to a `*` origin, so
 * origins listed in CORS_ORIGINS get an exact echo + allow-credentials; every
 * other caller keeps the open `*` policy the anonymous API has always had.
 */
export function applyCors(response: Response, request: Request, allowedOrigins?: string): Response {
  const origin = request.headers.get("origin");
  if (!origin || !allowedOrigins) return response;
  const allowed = allowedOrigins
    .split(",")
    .map((o) => o.trim().replace(/\/$/, ""))
    .filter(Boolean);
  if (!allowed.includes(origin)) return response;

  const headers = new Headers(response.headers);
  headers.set("access-control-allow-origin", origin);
  headers.set("access-control-allow-credentials", "true");
  headers.append("vary", "origin");
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}

/** A handled, client-facing error with an HTTP status and optional extra response headers/body. */
export class HttpError extends Error {
  readonly status: number;
  readonly extraHeaders?: Record<string, string>;
  readonly extraBody?: Record<string, unknown>;
  constructor(
    status: number,
    message: string,
    extraHeaders?: Record<string, string>,
    extraBody?: Record<string, unknown>,
  ) {
    super(message);
    this.status = status;
    this.extraHeaders = extraHeaders;
    this.extraBody = extraBody;
  }
}
