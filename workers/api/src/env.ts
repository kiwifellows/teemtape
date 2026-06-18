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

  /** Descriptive User-Agent for the SEC symbols sync cron (fair-access policy). */
  SEC_USER_AGENT: string;

  /** Secret — local: `workers/api/.dev.vars`; deployed: `npx wrangler secret put`. */
  POLYGON_API_KEY?: string;
}
