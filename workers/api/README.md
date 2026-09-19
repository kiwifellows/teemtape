# @teemtape/api

The teemtape backend: a single **Cloudflare Worker** that serves delayed quotes,
stores **anonymous notes + watchlists** in **Cloudflare D1**, caches quotes in
**KV**, and serves a multi-market symbols catalog that is refreshed out-of-band.

> Not a trading tool. Quotes are intentionally delayed (~1 min) and informational.

## Endpoints

| Method + path | Purpose |
| --- | --- |
| `GET /health` | Liveness + configured delay |
| `GET /api/quotes?symbols=AAPL,MSFT` | Delayed quotes (cached in KV) |
| `GET /api/symbols` | Paginated multi-market symbols catalog (see below) |
| `POST /api/watchlists` | Create an anonymous watchlist (returns MD5-shaped token) |
| `POST /api/handles` | Claim `{ handle }`, or auto-generate a unique one (empty body) |
| `GET /api/handles/:handle` | Check availability (`{ handle, available }`) |
| `GET /api/w/:token` | Watchlist + symbols |
| `GET /api/w/:token/agent` | Aggregate agent payload: watchlist, per-symbol note threads (optional `?limit=`, max 50) |
| `POST /api/w/:token/symbols` | Add a symbol (`{ "symbol": "AAPL" }`) |
| `GET /api/w/:token/notes?symbol=AAPL` | Notes for a symbol (newest first) |
| `POST /api/w/:token/notes` | Add a note (`{ symbol, body, source, handle? }`) |

### `GET /api/symbols`

Paginated catalog of listings (100 per page by default), keyed by canonical
symbol (`AAPL`, `FPH.NZ`, `BHP.AX`). Rows carry `exchange`, `mic`, `currency`,
`country`, `isin`, `cikStr`; a bare query like `amp` returns every market's
match, exact-base first.

| Query param | Default | Description |
| --- | --- | --- |
| `offset` | `0` | Zero-based row offset (`0`, `100`, `200`, …) |
| `limit` | `100` | Page size (max `100`) |
| `sort` | `ticker` | `ticker` / `alphabetical` or `title` / `name` |
| `q` | — | Search ticker **or** company name |
| `symbol` | — | Filter by ticker substring |
| `name` | — | Filter by company name substring |
| `exchange` | — | One market: code (`US`, `NZX`, `ASX`, `NSE`) or alias (`NASDAQ`) |

### Anonymous handles

So collaborators on a shared watchlist can tell each other apart without signing
in, a note may carry an optional `handle` (e.g. `user1234`) which becomes its
`author`. Handles are auto-generated and globally unique via `POST /api/handles`
(uniqueness enforced by the `handle` table), are stored client-side, and can be
changed to any still-available value. Handles are validated as 3–20 characters
(letters, numbers, `-`, `_`) starting with a letter, and normalized to lowercase.

When a note has no `handle`, posts with `source: "cli"` are attributed to
`agent-cli`; web notes get an `anon-xxxxxx` handle derived from the watchlist
token. All responses are JSON with permissive CORS.

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

## Symbols catalog sync

The Worker has **no cron** and never fetches listings. The `symbols` table is
filled by `packages/symbols-sync` (exchange / SEC listing files →
`teemtape.symbol.v1` NDJSON → idempotent SQL) and applied with
`wrangler d1 execute`. In production the *Sync symbols catalog* GitHub
workflow does this on the 1st and 15th of each month, or on demand, and then
publishes the table as a `teemtape.catalog.v1` snapshot to the KV key
`symbols:catalog:v1`; `/api/symbols` is answered from that snapshot in memory
(`src/catalog.ts`) and only falls back to querying D1 while the key is absent.

Locally, after `npm run migrate:local`:

```bash
npm run build --workspace @teemtape/symbols-sync            # from the repo root
node packages/symbols-sync/dist/cli.js fetch --market US  --out out/US.ndjson
node packages/symbols-sync/dist/cli.js fetch --market NZX --out out/NZX.ndjson
node packages/symbols-sync/dist/cli.js import out/*.ndjson --sql out/symbols.sql
cd workers/api && npx wrangler d1 execute teemtape-db --local --file ../../out/symbols.sql
# optional: serve search from the snapshot locally too
npx wrangler d1 execute teemtape-db --local --json --command "SELECT ticker, base, suffix, exchange_code, mic, currency, country, title, isin, cik_str, source FROM symbols" > ../../out/after.json
node ../../packages/symbols-sync/dist/cli.js snapshot ../../out/after.json --out ../../out/catalog.json
npx wrangler kv key put symbols:catalog:v1 --path ../../out/catalog.json --binding QUOTES_CACHE --local
```

Then verify:

```bash
npx wrangler d1 execute teemtape-db --local --command "SELECT suffix, COUNT(*) AS n FROM symbols GROUP BY suffix"
curl "http://127.0.0.1:8787/api/symbols?q=amp"
```

Canonical symbol rules, the record schema and the per-market source list:
[`docs/plans/multi-market.md`](../../docs/plans/multi-market.md).

## Quotes provider

Controlled by the `QUOTES_PROVIDER` var:

- `sample` (default) — deterministic local data, no key needed.
- `polygon` — fetches the Polygon free-tier previous-day aggregate. Requires the
  `POLYGON_API_KEY` secret; falls back to sample data per-symbol if a fetch fails.

Quotes are cached in KV (`QUOTE_CACHE_TTL_SECONDS`, default 5 min, shared by
every caller) to respect free-tier rate limits, and finished responses are held
in the edge Cache API for the delay window (`QUOTE_DELAY_SECONDS`, served with
`cache-control: public, max-age=<delay>`).

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

Production deploys run automatically on push to `main` (see
[`.github/workflows/deploy-api.yml`](../../.github/workflows/deploy-api.yml)).

Manual deploy:

```bash
cd workers/api
npm run migrate:remote                 # apply migrations to the prod D1
npm run deploy                          # wrangler deploy --env production
```

The production Worker is served at **`https://api.teemtape.com`** via a Custom
Domain in `wrangler.toml` (`custom_domain = true`). Wrangler creates the proxied
DNS record and certificate on deploy — no manual route or zone_id needed.

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
│   ├── 0002_symbols.sql   # SEC ticker reference data
│   └── 0003_handles.sql   # anonymous handles (uniqueness)
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
