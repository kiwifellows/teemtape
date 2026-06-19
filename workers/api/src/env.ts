/** Cloudflare bindings + vars available to the Worker (see wrangler.toml). */
export interface Env {
  /** D1 database for watchlists + notes. */
  DB: D1Database;
  /**
   * KV namespace for two purposes:
   *  1. Quote cache: keys prefixed `quote:v2:{symbol}`, TTL = QUOTE_CACHE_TTL_SECONDS.
   *  2. Rate-limit counters: keys prefixed `rl:{ip}:{window}`, TTL = 120s.
   */
  QUOTES_CACHE: KVNamespace;

  /**
   * Ordered, comma-separated list of quote providers to try.
   * Supported values: "yahoo" | "stooq" | "polygon" | "sample".
   * Example: "yahoo,stooq,polygon,sample"
   * Defaults to "yahoo,stooq,sample" when unset.
   * Polygon is silently skipped when POLYGON_API_KEY is absent.
   */
  QUOTES_PROVIDER?: string;
  /** How many seconds quotes are intentionally delayed (string in vars). Default 60. */
  QUOTE_DELAY_SECONDS?: string;
  /**
   * How many seconds a fetched quote is cached in KV (shared across ALL callers).
   * Any caller within the same TTL window receives the same cached value.
   * Minimum 60 (KV floor). Default 300 (5 minutes).
   */
  QUOTE_CACHE_TTL_SECONDS?: string;
  /**
   * Max requests per minute per client IP (string in vars). 0 = disabled.
   * Enforced by a KV-backed sliding window. Default 60.
   */
  RATE_LIMIT_RPM?: string;
  /**
   * Optional static API key for request authentication.
   * When set, every API request (except /health) must include the header:
   *   X-Api-Key: <value>
   * Set via `wrangler secret put API_KEY` — never commit the value.
   */
  API_KEY?: string;
  /** Web app base URL, used to build share links. */
  WEB_URL?: string;

  /** Descriptive User-Agent for the SEC symbols sync cron (fair-access policy). */
  SEC_USER_AGENT: string;

  /** Secret — local: `workers/api/.dev.vars`; deployed: `npx wrangler secret put`. */
  POLYGON_API_KEY?: string;
}
