# teemtape — Architecture

> Status: **Phase 2 — building.** Wireframes (Phase 1) are done. The CLI (M1) and
> the Cloudflare Worker API + D1 (M0) are now implemented behind one shared
> contract. This document is the reference plan; where code exists it links to it.
>
> - Backend (M0): [`workers/api`](../workers/api) — Worker + D1 + KV.
> - Shared contract: [`packages/api-client`](../packages/api-client).
> - CLI (M1): [`packages/cli`](../packages/cli).
> - Local mock of the contract: [`packages/mock-server`](../packages/mock-server).

## What teemtape is

An open-source ticker app for leaving **anonymous notes next to stock symbols**.
It is a learning tool for building software incrementally with agentic AI. It is
**not** a trading app — there is no order entry, no portfolio, no money movement.

Surfaces:

1. **Desktop web** (built first) — React.
2. **Mobile web** — React, responsive, then **React Native** once the web app is stable.
3. **CLI** — a thin client so AI agents (and power users) can read the watchlist
   and post notes that appear in the same note popups as end-user notes.

## High-level design

```
            ┌─────────┐     ┌──────────────────────┐
   CLI ────▶│         │     │                      │
            │ Worker  │────▶│  D1 (notes,          │
 Web   ────▶│  API    │     │      watchlists)     │
 Mobile────▶│         │     └──────────────────────┘
            └────┬────┘
                 │ (cached, delayed ~1 min)
                 ▼
        Polygon / Massive free API (quotes)
```

Everything runs on Cloudflare per the
[Cloudflare skills guide](https://github.com/kiwifellows/ai/blob/main/docs/clouds/cloudflare.md):

- **Cloudflare Workers** — single API Worker. Serves the React app's data needs
  and the CLI from the same endpoints (see [integration practices]: one simple
  contract, shared by all clients).
- **Cloudflare D1** — SQLite-backed database for notes and watchlists. Chosen over
  heavier options per [database practices]: start simple, normalize to 3NF, add
  indexes only when profiling shows a need.
- **Cloudflare KV** — short-TTL cache for the delayed quote payloads, so we respect
  the free-tier rate limits on Polygon/Massive ([integration practices]: respect
  rate limits, cache responses).
- **Cloudflare Pages / Workers Assets** — hosts the static React build.

This is deliberately a **modular monolith** (one Worker), not microservices, per
[architecture practices]: start simple, split only when there is evidence we need to.

## Data model (D1, draft)

Two tables to start — nothing speculative.

```sql
-- A watchlist is identified by an anonymous MD5 token that lives in the share URL.
CREATE TABLE watchlist (
  token       TEXT PRIMARY KEY,         -- md5 hex, e.g. 6f1ed0...
  created_at  INTEGER NOT NULL,         -- unix epoch (ms)
  symbols     TEXT NOT NULL DEFAULT '[]' -- JSON array of tickers
);

-- Anonymous notes attached to a (watchlist, symbol).
CREATE TABLE note (
  id          TEXT PRIMARY KEY,         -- uuid
  token       TEXT NOT NULL REFERENCES watchlist(token),
  symbol      TEXT NOT NULL,            -- e.g. AAPL
  author      TEXT NOT NULL,            -- chosen handle, anon-xxxxxx, or agent-cli
  source      TEXT NOT NULL,            -- 'web' | 'cli'
  body        TEXT NOT NULL,
  created_at  INTEGER NOT NULL
);

CREATE INDEX idx_note_token_symbol ON note (token, symbol, created_at);

-- Anonymous handles: a lightweight, sign-in-free identity so collaborators on a
-- shared watchlist can tell each other apart. Exists only to guarantee global
-- uniqueness ("never used before"); still no email/password/PII.
CREATE TABLE handle (
  handle      TEXT PRIMARY KEY,         -- normalized lowercase, e.g. "user1234"
  created_at  TEXT NOT NULL
);
```

Notes are anonymous. The `author` is the poster's chosen **handle** (e.g.
`user1234`) when one is set, falling back to a short token-derived label
(`anon-xxxxxx`) or `agent-cli`. No accounts, no PII collected ([security
practices]: don't collect data you don't need).

### Anonymous handles (no sign-in)

To let multiple people collaborate on the same shared watchlist without accounts,
each client picks a short, human-friendly **handle** once and reuses it:

- It is **auto-generated and unique** (`user1234`-style) the first time someone
  goes to add a note, and the user can change it to anything still available.
- It is stored **client-side** so it persists with no sign-in: `localStorage`
  in the browser, `~/.config/teemtape/config.json` for the CLI.
- Uniqueness is enforced **server-side** via the `handle` table. The handle is
  the note `author`, so collaborators can tell each other apart. It is *not* a
  secret or a credential — anyone can claim any free handle; it is purely a
  display identity. This is a deliberate first step that could later grow into a
  real account/handle, but stays simple for now.

## Share links (anonymous MD5 token)

- When a visitor first opens teemtape, the app generates a random watchlist
  `token` (an MD5 hex string) and puts it on the end of the URL: `/w/<token>`.
- That URL **is** the share link — sending it to a friend lets them see and add
  to the same watchlist and notes.
- The token is a capability/bearer identifier, so it must be generated from a
  cryptographically random source (not from guessable input) and only travel over
  HTTPS ([security practices]: secure defaults, encrypt in transit).

## Quote data sources

The Worker supports four quote providers, tried in priority order. The list is
configured via `QUOTES_PROVIDER` (comma-separated, e.g. `"yahoo,stooq,polygon,sample"`):

| Provider | Key required? | Data | Notes |
|----------|--------------|------|-------|
| **yahoo** | No | Yahoo Finance v8 chart API — regular-market price + previous close | Free, no account. Called directly via HTTP (the `yahoo-finance2` npm package uses Node.js internals that cannot run in a Cloudflare Worker, so we call the same underlying HTTP endpoint directly). |
| **stooq** | No | Stooq CSV endpoint — end-of-day OHLC | Free, no account. Lightweight CSV response. |
| **polygon** | `POLYGON_API_KEY` | Polygon previous-day aggregate | Free tier subject to rate limits; silently skipped when the key is absent. |
| **sample** | No | Deterministic hardcoded data | Always available; used in dev and as the final fallback. |

The default is `QUOTES_PROVIDER="yahoo,stooq,sample"`. Add `polygon` to the list
(and set `POLYGON_API_KEY`) to include it in the chain.

### When are external APIs called?

External quote APIs (Yahoo, Stooq, Polygon) are called **only on a KV cache miss**.

```
GET /api/quotes?symbols=AAPL,GOOG
         │
         ▼
  For each symbol:
    Check KV key "quote:v2:{symbol}"
         │
    ┌────┴────┐
    │ HIT     │ → return cached Quote (no external call)
    └────┬────┘
         │ MISS
         ▼
    Try providers in order (yahoo → stooq → polygon → sample)
    First success → write to KV with QUOTE_CACHE_TTL_SECONDS TTL
         │
         ▼
    Return Quote
```

The key design point: **the cache is shared across all callers**. If user1
requests GOOG at 8:20 am and user2 requests GOOG at 8:24 am, the second request
is served entirely from KV with no external API call (given the default 5-minute
TTL).

## Delayed quotes (~1 minute)

- The Worker fetches quotes and serves them with an intentional ~1-minute delay,
  surfaced in the UI with a "Delayed ~1 min" badge ([design practices]: make
  state clear and informative).
- `QUOTE_DELAY_SECONDS` (default `60`) is subtracted from the quote's `asOf`
  timestamp so the UI can display the correct data time.
- This is informational only — teemtape is not a trading app.

## Quote caching (shared KV, 5-minute TTL)

All quote data is cached in **Cloudflare KV** under the key `quote:v2:{symbol}`.
This is **not per-user** — it is a global, shared cache.

| Aspect | Value |
|--------|-------|
| Binding | `QUOTES_CACHE` KV namespace |
| Key | `quote:v2:{symbol}` (e.g. `quote:v2:AAPL`) |
| TTL | `QUOTE_CACHE_TTL_SECONDS` (default `300` s = 5 min) |
| Minimum | 60 s (Cloudflare KV floor) |
| Scope | Shared — identical for every user and every agent |

Each cached quote includes a `cachedAt` ISO timestamp so clients can show
"price cached at 8:20:14 am" alongside the delayed `asOf` time.

Rate-limit counters also live in the same KV namespace under the `rl:` prefix
(see [API guardrails](#api-guardrails) below). Keys are short-lived (120 s TTL)
and logically separate from quote data.

## API guardrails

The API is intentionally public (no user accounts, anonymous notes). The
following controls prevent abuse:

### 1. IP rate limiting (default: 60 req/min per IP)

Every request (except `/health` and `OPTIONS`) passes through a KV-backed
sliding-window rate limiter in `workers/api/src/rate-limit.ts`.

| Setting | Default | How to change |
|---------|---------|---------------|
| `RATE_LIMIT_RPM` | `60` | Set in `wrangler.toml` `[vars]` (or `wrangler secret put` for prod) |
| Disable | — | Set `RATE_LIMIT_RPM=0` |

When exceeded the API returns `429 Too Many Requests` with a `Retry-After`
header (seconds until the current minute window resets).

Cloudflare Workers also sit behind Cloudflare's network, which provides
additional DDoS protection and connection limiting at the edge — before requests
reach the Worker at all.

### 2. Optional static API key (`X-Api-Key` header)

Set the `API_KEY` secret (`wrangler secret put API_KEY`) to require all callers
to include:

```
X-Api-Key: <your-secret-key>
```

When `API_KEY` is **not set**, the API remains fully public (suitable for the
anonymous-notes model). When set, any request missing or providing the wrong key
receives `401 Unauthorized`. The health check endpoint (`/`, `/health`) is always
exempt.

This is appropriate for restricting the API to known agents or internal tooling.
For a public consumer app, rely on rate limiting instead.

### 3. Input validation (existing)

All inputs are validated in `workers/api/src/validation.ts`:

- Symbols: regex `^[A-Z][A-Z0-9.\-]{0,9}$`, max 50 per query
- Note bodies: max 2 000 characters
- Watchlist tokens: exactly 32 hex characters
- Handles: 3–20 characters, `[a-z0-9_-]`, starts with a letter
- Pagination offsets / limits: bounded integers

### 4. Parameterised queries (existing)

All D1 queries use `prepare().bind()` — no string interpolation, no SQL injection.

### 5. No PII collected (by design)

No email, password, or real identity is stored. The watchlist token is a
capability bearer (the URL is the credential). Anonymous handles are
display-only — not a login mechanism.

### Summary: what a raw curl / Postman request can do

| Action | Result without API_KEY set | Result with API_KEY set |
|--------|---------------------------|------------------------|
| GET /api/quotes | ✅ Works (rate-limited) | ❌ 401 (no key) |
| POST /api/w/:token/notes | ✅ Works (rate-limited + input validation) | ❌ 401 |
| Flood requests | ❌ 429 after 60/min | ❌ 401 |
| SQL injection | ❌ Blocked by parameterised queries | ❌ 401 + blocked |
| GET /health | ✅ Always works | ✅ Always works |

## API surface (draft, shared by web + mobile + CLI)

```
GET  /api/quotes?symbols=AAPL,MSFT      -> delayed quote rows
POST /api/handles                       -> claim { handle } or auto-generate a unique one
GET  /api/handles/:handle               -> { handle, available }
GET  /api/w/:token                      -> watchlist + symbols
POST /api/w/:token/symbols              -> add a symbol
GET  /api/w/:token/notes?symbol=AAPL    -> notes for a symbol
POST /api/w/:token/notes                -> add a note { symbol, body, source, handle? }
```

RESTful, JSON, simple ([integration practices] / [feature-development practices]).
The CLI calls these exact endpoints — no special backend path for agents; the
only difference is `source: "cli"` on posted notes. An optional `handle` on a
posted note sets its `author`.

## Planned repository layout

```
teemtape/
├── wireframes/        # Phase 1 — these HTML mockups (no build step)
├── docs/              # architecture + practice notes
├── apps/
│   ├── web/           # React desktop/mobile app (Phase 2)
│   └── native/        # React Native app (later)
├── packages/
│   └── cli/           # teemtape CLI (Phase 2)
└── workers/
    └── api/           # Cloudflare Worker + wrangler.toml + D1 migrations
```

A `wrangler.toml` will be added under `workers/api` following the Cloudflare
guide's checklist: `name`, `account_id`, `compatibility_date`, separate
`[env.dev]` / `[env.production]` sections, D1 + KV bindings, and `[vars]` for
non-secret config. Secrets (the Polygon/Massive API key) will be set with
`wrangler secret put`, never committed.

## How the practice guides shape this

- **Simplicity first / startup agility** — one Worker, one small DB, no
  speculative tables, ship the desktop slice first.
- **Incremental delivery** — wireframes → approval → desktop web → mobile web →
  CLI → React Native. Each is a shippable increment.
- **Security** — anonymous by design, no PII, HTTPS only, parameterized D1
  queries, secrets via Wrangler, input validation on note bodies.
- **Integration** — single REST/JSON contract reused by every client; cache and
  respect the third-party API's free-tier limits.
- **Design** — one shared design-token set (see `wireframes/assets/styles.css`)
  used across desktop, mobile, and later React Native for consistency.

[architecture practices]: https://github.com/kiwifellows/ai/blob/main/docs/practices/architecture.md
[database practices]: https://github.com/kiwifellows/ai/blob/main/docs/practices/database.md
[security practices]: https://github.com/kiwifellows/ai/blob/main/docs/practices/security.md
[integration practices]: https://github.com/kiwifellows/ai/blob/main/docs/practices/integration.md
[design practices]: https://github.com/kiwifellows/ai/blob/main/docs/practices/design.md
[feature-development practices]: https://github.com/kiwifellows/ai/blob/main/docs/practices/feature-development.md
