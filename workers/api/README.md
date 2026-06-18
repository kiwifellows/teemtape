# @teemtape/api

The teemtape backend: a single **Cloudflare Worker** that serves delayed quotes,
stores **anonymous notes + watchlists** in **Cloudflare D1**, caches quotes in
**KV**, and syncs the SEC symbol catalog on a schedule.

> Not a trading tool. Quotes are intentionally delayed (~1 min) and informational.

## Endpoints

| Method + path | Purpose |
| --- | --- |
| `GET /health` | Liveness + configured delay |
| `GET /api/quotes?symbols=AAPL,MSFT` | Delayed quotes (cached in KV) |
| `GET /api/symbols` | Paginated SEC symbol catalog (see below) |
| `POST /api/watchlists` | Create an anonymous watchlist (returns MD5-shaped token) |
| `GET /api/w/:token` | Watchlist + symbols |
| `POST /api/w/:token/symbols` | Add a symbol (`{ "symbol": "AAPL" }`) |
| `GET /api/w/:token/notes?symbol=AAPL` | Notes for a symbol (newest first) |
| `POST /api/w/:token/notes` | Add a note (`{ symbol, body, source }`) |

### `GET /api/symbols`

Paginated list of SEC company tickers (100 per page by default).

| Query param | Default | Description |
| --- | --- | --- |
| `offset` | `0` | Zero-based row offset (`0`, `100`, `200`, …) |
| `limit` | `100` | Page size (max `100`) |
| `sort` | `ticker` | `ticker` / `alphabetical` or `title` / `name` |
| `q` | — | Search ticker **or** company name |
| `symbol` | — | Filter by ticker substring |
| `name` | — | Filter by company name substring |

Notes posted with `source: "cli"` are attributed to `agent-cli`; web notes get an
anonymous `anon-xxxxxx` handle derived from the watchlist token. All responses are
JSON with permissive CORS.

## Run locally

```bash
npm install
npm run build --workspace @teemtape/api-client     # the Worker imports its types

# from workers/api:
npm run migrate:local                              # apply D1 schema to local D1
npm run dev                                         # wrangler dev on :8787
```

Then point the CLI at it:

```bash
TEEMTAPE_API_URL=http://127.0.0.1:8787 node ../../packages/cli/dist/index.js init
```

With no `POLYGON_API_KEY` set, the Worker serves deterministic **sample** quotes,
so it runs with zero external setup.

## SEC symbols sync

A cron trigger (`0 */12 * * *` — every 12 hours) fetches
[SEC company tickers](https://www.sec.gov/files/company_tickers.json) and upserts
the `symbols` D1 table. Update `SEC_USER_AGENT` in `wrangler.toml` with a real
contact email (SEC fair-access policy).

**Cron does not run automatically during local dev.** With `npm run dev` running,
trigger a sync manually in a second terminal:

```bash
cd workers/api
npm run sync:local
# equivalent: curl "http://127.0.0.1:8787/cdn-cgi/handler/scheduled"
```

Watch the `wrangler dev` terminal for `symbols sync complete { upserted: … }`.
Then verify:

```bash
npx wrangler d1 execute teemtape-db --local --command "SELECT COUNT(*) AS n FROM symbols"
curl "http://127.0.0.1:8787/api/symbols?offset=0&limit=5"
```

In production, the cron runs on deploy without any manual step.

## Quotes provider

Controlled by the `QUOTES_PROVIDER` var:

- `sample` (default) — deterministic local data, no key needed.
- `polygon` — fetches the Polygon free-tier previous-day aggregate. Requires the
  `POLYGON_API_KEY` secret; falls back to sample data per-symbol if a fetch fails.

Quotes are cached in KV for the delay window (`QUOTE_DELAY_SECONDS`, min 60s) to
respect free-tier rate limits.

## Configuration & secrets

Non-secret config lives in `wrangler.toml` (`[vars]` and `[env.production.vars]`).

**Local dev** (`wrangler dev`): secrets go in `workers/api/.dev.vars` (gitignored).
`wrangler secret put` does **not** inject into the local runtime — copy
`.dev.vars.example` and add your key:

```bash
cd workers/api
cp .dev.vars.example .dev.vars
# edit .dev.vars: POLYGON_API_KEY=your-polygon-key
```

Also set `QUOTES_PROVIDER = "polygon"` in `wrangler.toml` `[vars]` (production
already uses polygon via `[env.production.vars]`).

**Deployed Workers**: upload secrets with Wrangler from `workers/api/`:

```bash
cd workers/api
npx wrangler secret put POLYGON_API_KEY                  # default (dev) deploy target
npx wrangler secret put POLYGON_API_KEY --env production # production
```

Before first deploy, create the resources and paste their ids into `wrangler.toml`:

```bash
cd workers/api
npx wrangler d1 create teemtape-db            # -> database_id
npx wrangler kv namespace create QUOTES_CACHE # -> id
```

## Deploy

```bash
cd workers/api
npm run migrate:remote                 # apply migrations to the prod D1
npm run deploy                          # wrangler deploy --env production
```

## Test

```bash
npm test --workspace @teemtape/api
```

Tests run inside the real Workers runtime via
[`@cloudflare/vitest-pool-workers`](https://developers.cloudflare.com/workers/testing/vitest-integration/),
with isolated local D1 + KV and the migrations applied automatically. They cover
the quote, watchlist, note, symbols catalog, and SEC sync flows.

## Layout

```
workers/api/
├── wrangler.toml            # Worker config (dev defaults + [env.production])
├── migrations/
│   ├── 0001_init.sql      # watchlists, notes
│   └── 0002_symbols.sql   # SEC ticker reference data
├── src/
│   ├── index.ts             # router + scheduled sync
│   ├── env.ts               # binding types
│   ├── repo.ts              # D1 queries (parameterized)
│   ├── symbols.ts           # symbol catalog queries
│   ├── sync.ts              # SEC symbols sync job
│   ├── quotes.ts            # quote provider + KV cache
│   ├── ids.ts               # token/author/id generation
│   ├── validation.ts        # input validation
│   └── http.ts              # JSON/CORS/error helpers
└── test/                    # integration tests (workerd + D1 + KV)
```
