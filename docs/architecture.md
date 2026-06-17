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
  author      TEXT NOT NULL,            -- anon-xxxxxx or agent-cli
  source      TEXT NOT NULL,            -- 'web' | 'cli'
  body        TEXT NOT NULL,
  created_at  INTEGER NOT NULL
);

CREATE INDEX idx_note_token_symbol ON note (token, symbol, created_at);
```

Notes are anonymous: the `author` is a short handle derived from the watchlist
token (and a `agent-cli` label for CLI posts). No accounts, no PII collected
([security practices]: don't collect data you don't need).

## Share links (anonymous MD5 token)

- When a visitor first opens teemtape, the app generates a random watchlist
  `token` (an MD5 hex string) and puts it on the end of the URL: `/w/<token>`.
- That URL **is** the share link — sending it to a friend lets them see and add
  to the same watchlist and notes.
- The token is a capability/bearer identifier, so it must be generated from a
  cryptographically random source (not from guessable input) and only travel over
  HTTPS ([security practices]: secure defaults, encrypt in transit).

## Delayed quotes (~1 minute)

- The Worker fetches quotes from the Polygon/Massive free tier and serves them
  with an intentional ~1-minute delay, surfaced in the UI with a "Delayed ~1 min"
  badge ([design practices]: make state clear and informative).
- Quote responses are cached in KV with a short TTL to stay within free-tier
  rate limits and to keep the app fast ([integration practices]: cache to reduce
  API calls; add resilience when we see real failures, not before).

## API surface (draft, shared by web + mobile + CLI)

```
GET  /api/quotes?symbols=AAPL,MSFT      -> delayed quote rows
GET  /api/w/:token                      -> watchlist + symbols
POST /api/w/:token/symbols              -> add a symbol
GET  /api/w/:token/notes?symbol=AAPL    -> notes for a symbol
POST /api/w/:token/notes                -> add a note { symbol, body, source }
```

RESTful, JSON, simple ([integration practices] / [feature-development practices]).
The CLI calls these exact endpoints — no special backend path for agents; the
only difference is `source: "cli"` on posted notes.

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
