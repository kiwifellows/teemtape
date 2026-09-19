/** Cloudflare bindings + vars available to the Worker (see wrangler.toml). */
export interface Env {
  /** D1 database for watchlists + notes. */
  DB: D1Database;
  /**
   * KV namespace holding the shared quote cache (keys `quote:v2:{symbol}`,
   * TTL = QUOTE_CACHE_TTL_SECONDS), the short-lived authz link cache
   * (`authz:v1:{token}`, see authz.ts) and the symbols catalog snapshot
   * (`symbols:catalog:v1`, written by the sync workflow, see catalog.ts).
   */
  QUOTES_CACHE: KVNamespace;
  /**
   * Workers Rate Limiting binding (`[[ratelimits]]` in wrangler.toml), keyed
   * by client IP. The limit and period live on the binding. Optional: leave
   * it out to disable rate limiting.
   */
  RATE_LIMITER?: RateLimit;

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
   * Optional static API key for request authentication.
   * When set, every API request (except /health) must include the header:
   *   X-Api-Key: <value>
   * Set via `wrangler secret put API_KEY` — never commit the value.
   */
  API_KEY?: string;
  /**
   * How long an isolate keeps its in-memory symbols catalog before re-reading
   * the KV snapshot (string in vars). Default 3600. 0 = re-read every request.
   */
  SYMBOLS_CATALOG_REFRESH_SECONDS?: string;
  /** Web app base URL, used to build share links. */
  WEB_URL?: string;

  /**
   * Optional authorisation hook (service binding to the private pro API).
   * Absent → every watchlist is public, exactly today's behaviour.
   * See docs/authz-contract.md and src/authz.ts.
   */
  AUTHZ?: Fetcher;
  /** Where to send callers who need to sign in (returned in 401/403 bodies). */
  DASHBOARD_URL?: string;
  /** Timeout for a single AUTHZ call in ms (string in vars). Default 250. */
  AUTHZ_TIMEOUT_MS?: string;
  /**
   * Comma-separated browser origins allowed to send credentials (cookies).
   * Requests from these origins get an exact-origin CORS echo plus
   * `access-control-allow-credentials: true`; everyone else gets `*`.
   */
  CORS_ORIGINS?: string;

  /** Secret — local: `workers/api/.dev.vars`; deployed: `npx wrangler secret put`. */
  POLYGON_API_KEY?: string;
}
