import type { Env } from "./env.js";
import { HttpError } from "./http.js";

const WINDOW_SECONDS = 60;
const DEFAULT_RPM = 60;

function getRPM(env: Env): number {
  const n = Number(env.RATE_LIMIT_RPM ?? DEFAULT_RPM);
  return Number.isFinite(n) && n > 0 ? n : 0; // 0 means disabled
}

/**
 * KV-backed sliding-window rate limiter keyed by client IP.
 *
 * Uses a 1-minute tumbling window. The counter is stored in QUOTES_CACHE under
 * the key `rl:{ip}:{window}` with a 2-minute TTL so adjacent windows overlap
 * cleanly. Cloudflare populates `cf-connecting-ip` with the true client IP even
 * behind proxies, so that header is preferred over `x-forwarded-for`.
 *
 * Set RATE_LIMIT_RPM=0 to disable entirely (e.g. for local dev).
 * Throws HttpError(429) with a `retry-after` header when the limit is exceeded.
 */
export async function checkRateLimit(request: Request, env: Env): Promise<void> {
  const rpm = getRPM(env);
  if (!rpm) return;

  const ip =
    request.headers.get("cf-connecting-ip") ??
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "unknown";

  const window = Math.floor(Date.now() / (WINDOW_SECONDS * 1000));
  const key = `rl:${ip}:${window}`;

  const raw = await env.QUOTES_CACHE.get(key);
  const count = raw ? parseInt(raw, 10) : 0;

  if (count >= rpm) {
    const retryAfter = WINDOW_SECONDS - (Math.floor(Date.now() / 1000) % WINDOW_SECONDS);
    throw new HttpError(429, `rate limit exceeded — max ${rpm} requests per minute`, {
      "retry-after": String(retryAfter),
    });
  }

  await env.QUOTES_CACHE.put(key, String(count + 1), {
    expirationTtl: WINDOW_SECONDS * 2,
  });
}

/**
 * Optional static API-key check.
 *
 * When the API_KEY secret is configured in Wrangler, every request (except
 * OPTIONS and /health) must include the header:
 *   X-Api-Key: <value>
 *
 * This is a simple bearer-style guard suitable for restricting access to known
 * agents or internal tooling. Leave API_KEY unset to keep the API fully public
 * (the anonymous-notes model works without any auth).
 *
 * Throws HttpError(401) when the key is wrong or missing.
 */
export function checkApiKey(request: Request, env: Env): void {
  if (!env.API_KEY) return; // not configured — public access allowed
  const provided = request.headers.get("x-api-key");
  if (!provided || provided !== env.API_KEY) {
    throw new HttpError(401, "missing or invalid X-Api-Key header");
  }
}
