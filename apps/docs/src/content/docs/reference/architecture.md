---
title: Architecture
description: The teemtape system design — surfaces, the Cloudflare backend, data model, and the shared API contract.
---

teemtape is a **modular monolith**: a single Cloudflare Worker API with several
thin clients (web, CLI, and later mobile) that all talk to it through one shared
contract. This page is the reference plan; where code exists, it points to it.

| Piece | Location |
| --- | --- |
| Backend (M0) | `workers/api` — Worker + D1 + KV |
| Shared contract | `packages/api-client` |
| CLI (M1) | `packages/cli` |
| Local mock of the contract | `packages/mock-server` |
| Web app (M2) | `apps/web` |

## What teemtape is

An open-source ticker app for leaving **anonymous notes next to stock symbols**,
and a learning tool for building software incrementally with agentic AI. It is
**not** a trading app — no order entry, no portfolio, no money movement.

Surfaces:

1. **Desktop web** — React (built first among the apps).
2. **Mobile web** — React, responsive, then **React Native** once the web app is
   stable.
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

Everything runs on Cloudflare:

- **Cloudflare Workers** — a single API Worker serving the web app's data needs
  and the CLI from the same endpoints (one simple contract, shared by all
  clients).
- **Cloudflare D1** — SQLite-backed database for notes, watchlists, handles, and
  the symbol catalog. Start simple; add indexes only when profiling shows a need.
- **Cloudflare KV** — short-TTL cache for delayed quote payloads, to respect the
  free-tier rate limits on the upstream quote provider.
- **Cloudflare Pages / Workers Assets** — hosts the static React build.

This is deliberately a modular monolith (one Worker), not microservices — split
only when there's evidence we need to.

## Data model (D1)

Three core tables, plus the symbol catalog.

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

-- Anonymous handles: a sign-in-free identity so collaborators on a shared
-- watchlist can tell each other apart. Exists only to guarantee global
-- uniqueness; no email/password/PII.
CREATE TABLE handle (
  handle      TEXT PRIMARY KEY,         -- normalized lowercase, e.g. "user1234"
  created_at  TEXT NOT NULL
);
```

Notes are anonymous. The `author` is the poster's chosen
[handle](/users/handles/) when set, falling back to a short token-derived label
(`anon-xxxxxx`) or `agent-cli`. No accounts, no PII.

The SEC ticker catalog is stored in a `symbols` table, kept fresh by a scheduled
sync (see the [HTTP API reference](/reference/api/#sec-symbols-sync)).

## Share links (anonymous MD5 token)

- On first visit, the app generates a random watchlist `token` (an MD5 hex
  string) and puts it on the URL: `/w/<token>`.
- That URL **is** the share link — sending it lets someone see and add to the
  same watchlist and notes.
- The token is a capability/bearer identifier: generated from a cryptographically
  random source and only sent over HTTPS.

See [watchlists & sharing](/users/watchlists/).

## Delayed quotes (~1 minute)

- The Worker fetches quotes from the Polygon/Massive free tier and serves them
  with an intentional ~1-minute delay, surfaced in the UI with a "delayed ~1 min"
  badge.
- Quote responses are cached in KV with a short TTL to stay within free-tier
  rate limits and keep the app fast.

## API surface

The single contract shared by web, mobile, and CLI:

```
GET  /api/quotes?symbols=AAPL,MSFT      -> delayed quote rows
GET  /api/symbols                       -> paginated SEC symbol catalog
POST /api/handles                       -> claim { handle } or auto-generate one
GET  /api/handles/:handle               -> { handle, available }
POST /api/watchlists                    -> create an anonymous watchlist
GET  /api/w/:token                      -> watchlist + symbols
POST /api/w/:token/symbols              -> add a symbol
GET  /api/w/:token/notes?symbol=AAPL    -> notes for a symbol
POST /api/w/:token/notes                -> add a note { symbol, body, source, handle? }
```

The CLI calls these exact endpoints — there's no special backend path for agents.
The only difference is `source: "cli"` on posted notes; an optional `handle` sets
the `author`. See the full [HTTP API reference](/reference/api/).

## Repository layout

```
teemtape/
├── apps/
│   ├── web/            # React desktop/mobile web app (@teemtape/web)
│   └── docs/           # this Astro + Starlight docs site
├── packages/
│   ├── api-client/     # @teemtape/api-client — shared types + typed client
│   ├── cli/            # @teemtape/cli — Commander.js CLI
│   └── mock-server/    # dependency-free in-memory API mock
├── workers/
│   └── api/            # @teemtape/api — Cloudflare Worker + D1 + KV
├── wireframes/         # Phase 1 HTML mockups (no build step)
├── skills/             # Agent Skills (teemtape-cli)
└── docs/               # source Markdown these pages are built from
```

## Design principles

- **Simplicity first** — one Worker, one small DB, no speculative tables, ship a
  thin slice first.
- **Incremental delivery** — wireframes → web → CLI → mobile, each a shippable
  increment.
- **Security** — anonymous by design, no PII, HTTPS only, parameterized D1
  queries, secrets via Wrangler, input validation on note bodies.
- **Integration** — a single REST/JSON contract reused by every client; cache and
  respect the third-party API's free-tier limits.
- **Design** — one shared design-token set used across surfaces for consistency.
