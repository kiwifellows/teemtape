---
title: HTTP API
description: The teemtape Worker API — endpoints for quotes, the symbol catalog, watchlists, notes, and anonymous handles.
---

teemtape's backend is a single **Cloudflare Worker** that serves delayed quotes,
stores anonymous notes + watchlists in **D1**, caches quotes in **KV**, and syncs
the SEC symbol catalog on a schedule. Every client — web, CLI, and future mobile
— uses this one contract (via the shared `@teemtape/api-client` package).

The production API is served at **`https://api.teemtape.com`**. All responses are
JSON with permissive CORS.

:::caution[Not a trading tool]
Quotes are intentionally delayed (~1 min) and informational only.
:::

## Endpoints

| Method + path | Purpose |
| --- | --- |
| `GET /health` | Liveness + configured delay |
| `GET /api/quotes?symbols=AAPL,MSFT` | Delayed quotes (cached in KV) |
| `GET /api/symbols` | Paginated SEC symbol catalog (see below) |
| `POST /api/watchlists` | Create an anonymous watchlist (returns an MD5-shaped token) |
| `POST /api/handles` | Claim `{ handle }`, or auto-generate a unique one (empty body) |
| `GET /api/handles/:handle` | Check availability (`{ handle, available }`) |
| `GET /api/w/:token` | Watchlist + symbols |
| `POST /api/w/:token/symbols` | Add a symbol (`{ "symbol": "AAPL" }`) |
| `GET /api/w/:token/notes?symbol=AAPL` | Notes for a symbol (newest first) |
| `POST /api/w/:token/notes` | Add a note (`{ symbol, body, source, handle? }`) |
| `GET /w/:token` | Watchlist page with embedded JSON, alternate links, and the same watchlist data visible in the browser |
| `GET /w/:token.md` | Markdown export of the watchlist, symbols, and note summaries |
| `GET /ai/watchlist/:token` | Compact AI-friendly JSON payload for watchlists and notes |

For the exact JSON response shapes, see
[JSON output shapes](/agents/json-output/) (the CLI mirrors these types).

## `GET /api/symbols`

A paginated list of SEC company tickers (100 per page by default).

| Query param | Default | Description |
| --- | --- | --- |
| `offset` | `0` | Zero-based row offset (`0`, `100`, `200`, …) |
| `limit` | `100` | Page size (max `100`) |
| `sort` | `ticker` | `ticker` / `alphabetical` or `title` / `name` |
| `q` | — | Search ticker **or** company name |
| `symbol` | — | Filter by ticker substring |
| `name` | — | Filter by company name substring |

## Anonymous handles

So collaborators on a shared watchlist can tell each other apart without signing
in, a note may carry an optional `handle` (e.g. `user1234`) which becomes its
`author`. Handles are auto-generated and globally unique via `POST /api/handles`
(uniqueness enforced by the `handle` table), stored client-side, and can be
changed to any still-available value.

Handles are validated as **3–20 characters** (letters, numbers, `-`, `_`),
**starting with a letter**, and normalized to lowercase. See
[anonymous handles](/users/handles/).

When a note has no `handle`, posts with `source: "cli"` are attributed to
`agent-cli`; web notes get an `anon-xxxxxx` handle derived from the watchlist
token.

## Quotes provider

Controlled by the `QUOTES_PROVIDER` variable on the Worker:

- **`sample`** (default) — deterministic local data, no key needed.
- **`polygon`** — fetches the Polygon free-tier previous-day aggregate. Requires
  the `POLYGON_API_KEY` secret; falls back to sample data per-symbol if a fetch
  fails.

Quotes are cached in KV for the delay window (`QUOTE_DELAY_SECONDS`, minimum 60s)
to respect free-tier rate limits.

## SEC symbols sync

A cron trigger (`0 */12 * * *`, every 12 hours) fetches the
[SEC company tickers](https://www.sec.gov/files/company_tickers.json) and upserts
the `symbols` D1 table. Set `SEC_USER_AGENT` in `wrangler.toml` to a real contact
email (SEC fair-access policy).

Cron does **not** run automatically during local dev. With `npm run dev` running,
trigger a sync manually:

```bash
cd workers/api
npm run sync:local
# equivalent: curl "http://127.0.0.1:8787/cdn-cgi/handler/scheduled"
```

Then verify:

```bash
npx wrangler d1 execute teemtape-db --local --command "SELECT COUNT(*) AS n FROM symbols"
curl "http://127.0.0.1:8787/api/symbols?offset=0&limit=5"
```

In production, the cron runs on deploy with no manual step.

## Running the Worker locally

```bash
npm install
npm run build --workspace @teemtape/api-client   # the Worker imports its types

cd workers/api
npm run migrate:local                            # apply the D1 schema locally
npm run dev                                       # wrangler dev on :8787
```

With no `POLYGON_API_KEY` set, the Worker serves deterministic sample quotes — so
it runs with zero external setup. See the
[local development guide](/contributing/local-development/) for secrets and the
mock alternative.

## Deploy

Production deploys run automatically on push to `main`. Manual deploy:

```bash
cd workers/api
npm run migrate:remote     # apply migrations to the prod D1
npm run deploy             # wrangler deploy --env production
```

The production Worker uses a Cloudflare Custom Domain (`api.teemtape.com`);
Wrangler creates the proxied DNS record and certificate on deploy.
