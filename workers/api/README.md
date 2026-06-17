# @teemtape/api

The teemtape backend: a single **Cloudflare Worker** that serves delayed quotes
and stores **anonymous notes + watchlists** in **Cloudflare D1**, with a **KV**
cache for quotes. This is milestone **M0** — it implements the same contract the
CLI (and later the web/mobile apps) already use via `@teemtape/api-client`.

> Not a trading tool. Quotes are intentionally delayed (~1 min) and informational.

## Endpoints

| Method + path | Purpose |
| --- | --- |
| `GET /health` | Liveness + configured delay |
| `GET /api/quotes?symbols=AAPL,MSFT` | Delayed quotes (cached in KV) |
| `POST /api/watchlists` | Create an anonymous watchlist (returns MD5-shaped token) |
| `GET /api/w/:token` | Watchlist + symbols |
| `POST /api/w/:token/symbols` | Add a symbol (`{ "symbol": "AAPL" }`) |
| `GET /api/w/:token/notes?symbol=AAPL` | Notes for a symbol (newest first) |
| `POST /api/w/:token/notes` | Add a note (`{ symbol, body, source }`) |

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

## Quotes provider

Controlled by the `QUOTES_PROVIDER` var:

- `sample` (default) — deterministic local data, no key needed.
- `polygon` — fetches the Polygon free-tier previous-day aggregate. Requires the
  `POLYGON_API_KEY` secret; falls back to sample data per-symbol if a fetch fails.

Quotes are cached in KV for the delay window (`QUOTE_DELAY_SECONDS`, min 60s) to
respect free-tier rate limits.

## Configuration & secrets

Non-secret config lives in `wrangler.toml` (`[vars]` and `[env.production.vars]`).
Secrets are never committed — set them with Wrangler:

```bash
wrangler secret put POLYGON_API_KEY                  # dev
wrangler secret put POLYGON_API_KEY --env production # production
```

Before first deploy, create the resources and paste their ids into `wrangler.toml`:

```bash
wrangler d1 create teemtape-db            # -> database_id
wrangler kv:namespace create QUOTES_CACHE # -> id
```

## Deploy

```bash
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
the quote, watchlist, and note flows plus validation/error paths.

## Layout

```
workers/api/
├── wrangler.toml            # Worker config (dev defaults + [env.production])
├── migrations/0001_init.sql # D1 schema
├── src/
│   ├── index.ts             # router + error handling
│   ├── env.ts               # binding types
│   ├── repo.ts              # D1 queries (parameterized)
│   ├── quotes.ts            # quote provider + KV cache
│   ├── ids.ts               # token/author/id generation
│   ├── validation.ts        # input validation
│   └── http.ts              # JSON/CORS/error helpers
└── test/api.spec.ts         # integration tests (workerd + D1 + KV)
```
