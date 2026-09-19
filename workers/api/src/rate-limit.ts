import type { Env } from "./env.js";
import { HttpError } from "./http.js";

/** Must match `simple.period` of the RATE_LIMITER binding in wrangler.toml. */
const PERIOD_SECONDS = 60;

/**
 * Per-IP rate limit via the Workers Rate Limiting binding.
 *
 * The limit itself (requests per period) is declared on the binding in
 * wrangler.toml, not here. The binding keeps its counters in memory at the
 * edge, so a request costs no KV operations — the previous KV counter did a
 * read *and* a write per request, which on the Free plan (1,000 KV writes a
 * day, shared with teemtape-pro) took the whole API down after ~1,000 calls.
 *
 * Cloudflare populates `cf-connecting-ip` with the true client IP even
 * behind proxies, so that header is preferred over `x-forwarded-for`.
 *
 * Leave the binding out (e.g. a scratch config) to disable limiting entirely.
 * Throws HttpError(429) with a `retry-after` header when the limit is exceeded.
 */
export async function checkRateLimit(request: Request, env: Env): Promise<void> {
  if (!env.RATE_LIMITER) return;

  const ip =
    request.headers.get("cf-connecting-ip") ??
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "unknown";

  const { success } = await env.RATE_LIMITER.limit({ key: ip });
  if (!success) {
    // The binding does not expose where we are in the window; the period is
    // the longest a well-behaved client ever has to wait.
    throw new HttpError(429, "rate limit exceeded — too many requests per minute", {
      "retry-after": String(PERIOD_SECONDS),
    });
  }
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
