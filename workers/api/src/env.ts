/** Cloudflare bindings + vars available to the Worker (see wrangler.toml). */
export interface Env {
  /** D1 database for watchlists + notes. */
  DB: D1Database;
  /** KV cache for delayed quote payloads. */
  QUOTES_CACHE: KVNamespace;

  /** "sample" (no key needed) | "polygon". */
  QUOTES_PROVIDER?: string;
  /** How many seconds quotes are intentionally delayed (string in vars). */
  QUOTE_DELAY_SECONDS?: string;
  /** Web app base URL, used to build share links. */
  WEB_URL?: string;

  /** Secret — set with `wrangler secret put POLYGON_API_KEY`. */
  POLYGON_API_KEY?: string;
}
