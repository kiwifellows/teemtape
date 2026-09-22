---
title: HTTP API
description: The teemtape Worker API — endpoints for quotes, the symbol catalog, watchlists, notes, and anonymous handles.
---

teemtape's backend is a single **Cloudflare Worker** that serves delayed quotes,
stores anonymous notes + watchlists in **D1**, caches quotes in **KV**, and serves
a multi-market symbols catalog (refreshed out-of-band, see below). Every client — web, CLI, and future mobile
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
| `GET /api/symbols` | Paginated multi-market symbols catalog (see below) |
| `POST /api/watchlists` | Create an anonymous watchlist (returns an MD5-shaped token) |
| `POST /api/handles` | Claim `{ handle }`, or auto-generate a unique one (empty body) |
| `GET /api/handles/:handle` | Check availability (`{ handle, available }`) |
| `GET /api/whoami` | The signed-in caller and their most recent saved list (`{ user: { handle } \| null, lastWatchlist: { token, name } \| null }`) when the [authorisation hook](#authorisation-hook-teemtape-pro) is configured |
| `GET /api/w/:token` | Watchlist + symbols |
| `GET /api/w/:token/agent` | Aggregate agent payload: watchlist, per-symbol note threads (optional `?limit=`, max 50) |
| `POST /api/w/:token/symbols` | Add a symbol (`{ "symbol": "AAPL" }`) |
| `GET /api/w/:token/notes?symbol=AAPL` | Notes for a symbol (newest first) |
| `POST /api/w/:token/notes` | Add a note (`{ symbol, body, source, handle? }`) |

### `GET /api/w/:token/agent`

Aggregate payload for AI agents — watchlist metadata, symbols, and note threads in
**one request** (replaces N per-symbol note fetches).

| Query param | Default | Description |
| --- | --- | --- |
| `limit` | `50` | Max symbols to include (max `50`) |

Returns `AgentWatchlistResponse` from `@teemtape/api-client`: `{ watchlist, stocks[] }`
with optional `truncated`, `totalSymbols`, and `symbolLimit` when capped. The web
app wraps this at [Web agent endpoints](/reference/web-agent-endpoints/).

Share-URL routes on **`www.teemtape.com`** (`/w/:token`, `/ai/watchlist/:token`,
`/w/:token.md`) are documented separately in
[Web agent endpoints](/reference/web-agent-endpoints/). Agents post notes through
the `POST /api/w/:token/notes` row above.

For the exact JSON response shapes, see
[JSON output shapes](/agents/json-output/) (the CLI mirrors these types).

## Symbols: one string, one listing

Tickers are only unique per exchange — `AMP` is Ameriprise on NYSE *and* AMP
Limited on ASX. teemtape therefore identifies a listing by a **canonical
symbol**: bare for US listings (`AAPL`, `BRK-B`) and Yahoo-style suffixed for
every other market (`FPH.NZ`, `BHP.AX`, `0700.HK`, `7203.T`, `VOD.L`,
`RELIANCE.NS`). That string is what you store on watchlists and notes.

| Market | Suffix | Example |
| --- | --- | --- |
| US (NYSE / Nasdaq / OTC) | *(none)* | `AAPL` |
| NZX | `.NZ` | `FPH.NZ` |
| ASX | `.AX` | `BHP.AX` |
| SGX | `.SI` | `C6L.SI` |
| Hong Kong | `.HK` | `0700.HK` |
| Tokyo | `.T` | `7203.T` |
| London | `.L` | `VOD.L` |
| XETRA / Paris / Amsterdam | `.DE` / `.PA` / `.AS` | `SAP.DE` |
| NSE / BSE India | `.NS` / `.BO` | `RELIANCE.NS` |

Anywhere a symbol is accepted you may also write `EXCHANGE:TICKER`
(`ASX:BHP`, `nzx:fph`, `NASDAQ:AAPL`); the API normalises it to the canonical
form. Symbols match `^[A-Z0-9][A-Z0-9.&\-]{0,19}$` after normalisation.

## `GET /api/symbols`

A paginated catalog of listings (100 per page by default). Each row carries
its market so a bare query such as `amp` shows **both** companies, exact
matches first — pick the one you mean; the API never silently chooses.

| Query param | Default | Description |
| --- | --- | --- |
| `offset` | `0` | Zero-based row offset (`0`, `100`, `200`, …) |
| `limit` | `100` | Page size (max `100`) |
| `sort` | `ticker` | `ticker` / `alphabetical` or `title` / `name` |
| `q` | — | Search ticker **or** company name |
| `symbol` | — | Filter by ticker substring |
| `name` | — | Filter by company name substring |
| `exchange` | — | Only one market: a code (`US`, `NZX`, `ASX`, `NSE`, …) or alias (`NASDAQ`, `NYSE`) |

```json
{
  "symbols": [
    { "ticker": "AMP", "exchange": "NYSE", "mic": "XNYS", "currency": "USD", "country": "US", "title": "AMERIPRISE FINANCIAL INC", "isin": null, "cikStr": 820027 },
    { "ticker": "AMP.AX", "exchange": "ASX", "mic": "XASX", "currency": "AUD", "country": "AU", "title": "AMP LIMITED", "isin": null, "cikStr": null }
  ],
  "offset": 0, "limit": 100, "total": 2, "sort": "ticker"
}
```

Markets currently in the catalog: **US, NZX, ASX, NSE**. Symbols on other
markets in the table above are accepted and quoted, just not searchable yet.

## Authorisation hook (teemtape Pro)

The API is anonymous by default and stays that way when self-hosted. The
hosted service adds accounts and per-watchlist permissions through an
**optional service binding** named `AUTHZ`: for each watchlist request the
Worker asks that service *"may this caller do this action on this list?"*
and enforces the answer. Denials come back as:

| Status | `reason` | Meaning |
| --- | --- | --- |
| `401` | `sign_in_required` | The list is private and the caller has no credential |
| `403` | `forbidden` | The caller is known but has no (sufficient) role on the list |

```json
{ "error": "this watchlist is private — sign in to continue",
  "reason": "sign_in_required",
  "signInUrl": "https://app.teemtape.com" }
```

Credentials are an `Authorization: Bearer <access token>` header (CLI, agents)
or the session cookie set by the app on `.teemtape.com` (browser). With no
`AUTHZ` binding configured, every list is `public-edit` and none of this
applies. The full contract is in
[`docs/authz-contract.md`](https://github.com/kiwifellows/teemtape/blob/main/docs/authz-contract.md).

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

Quotes are cached in KV (`QUOTE_CACHE_TTL_SECONDS`, default 5 min, shared by
every caller) to respect free-tier rate limits, and finished responses are held
in the edge Cache API for the delay window (`QUOTE_DELAY_SECONDS`, served with
`cache-control: public, max-age=<delay>`).

## Symbols catalog sync

The Worker never fetches listings itself. The catalog is produced by the
`@teemtape/symbols-sync` pipeline (`packages/symbols-sync`) from each
exchange's or regulator's own public listing file — the SEC for the US, the
NZX market page, the ASX listed-companies CSV, the NSE equity master — and
imported with `wrangler d1 execute`. No prices are fetched and nothing comes
from Yahoo Finance.

In production this is the **Sync symbols catalog** GitHub workflow: it runs
on the 1st and 15th of each month and can be started by hand with a custom
market list (or as a dry run that only uploads the NDJSON/SQL artifacts).
After importing, it publishes the table as a compact JSON snapshot to KV; the
Worker serves `GET /api/symbols` from that snapshot in memory and edge-caches
responses for an hour, so a fresh catalog is fully visible within ~2 hours.

Locally:

```bash
npm run build --workspace @teemtape/symbols-sync
node packages/symbols-sync/dist/cli.js markets                      # what has an adapter
node packages/symbols-sync/dist/cli.js fetch --market NZX --out out/NZX.ndjson
node packages/symbols-sync/dist/cli.js import out/*.ndjson --sql out/symbols.sql
cd workers/api && npx wrangler d1 execute teemtape-db --local --file ../../out/symbols.sql
```

Then verify:

```bash
npx wrangler d1 execute teemtape-db --local --command "SELECT suffix, COUNT(*) AS n FROM symbols GROUP BY suffix"
curl "http://127.0.0.1:8787/api/symbols?q=amp"
```

Design, the `teemtape.symbol.v1` record shape, and the per-market source list
live in the repo at `docs/plans/multi-market.md`.

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
