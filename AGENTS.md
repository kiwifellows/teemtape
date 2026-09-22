# AGENTS.md — working in teemtape

Read this first. `CLAUDE.md` just points here. Keep it current when you
change something it describes.

## What this is

An open-source (MIT) **ticker app for commenting on stocks**: a watchlist
lives at `teemtape.com/w/<32-hex token>`, **the URL is the only credential**,
anyone with it can see the list, add symbols, and leave anonymous notes.
Humans use the web app; AI agents use the CLI (`@teemtape/cli`) and the
`teemtape-cli` skill, and their notes show up in the same threads. Quotes
are delayed ~1 min and informational. **Not a trading app, never advice.**

The project is also a public example of building software incrementally
with agentic AI, so keep the code readable and the docs honest.

## Layout (npm workspaces)

```
workers/api          @teemtape/api          Cloudflare Worker: quotes proxy, watchlists, notes, handles (D1 + KV)
apps/web             @teemtape/web          React/Vite app at teemtape.com (+ Pages functions for /w/:token.md, /ai/…)
apps/docs            docs                   Astro/Starlight → docs.teemtape.com (Workers static assets)
packages/api-client  @teemtape/api-client   typed client shared by CLI + web (published to npm)
packages/cli         @teemtape/cli          Commander CLI for humans and agents (published to npm)
packages/mock-server @teemtape/mock-server  dependency-free in-memory API for local/dev/tests
packages/symbols-sync @teemtape/symbols-sync symbols pipeline: exchange listings → NDJSON → D1 import SQL (Node, run by CI)
skills/teemtape-cli                          the agent skill (published to ClawHub)
docs/                                        architecture, roadmap, plans, market research, authz contract
```

Deep dives: `docs/architecture.md` (data model, quotes providers, caching,
guardrails), `docs/authz-contract.md` (the hook, below), `docs/roadmap.md`
(milestones M0–M5), `docs/plans/paid-tier-plan.md` (teemtape Pro),
`docs/plans/multi-market.md` (canonical symbols, the symbols pipeline, where
symbol data may and may not come from).

## The private companion: teemtape-pro

Paid features (accounts, saved watchlists, roles/invites, scoped agent
tokens, Stripe) live in **`github.com/kiwifellows/teemtape-pro`** (private,
usually checked out at `../teemtape-pro`) and are served at
**app.teemtape.com**. This repo stays complete and free on its own. The only
seams:

- **The `AUTHZ` hook** (`workers/api/src/authz.ts`, contract in
  `docs/authz-contract.md`). An *optional* service binding; per watchlist
  request the API asks "may this caller do this action on this list?".
  **Unbound → every list is `public-edit`, exactly today's behaviour.**
  Errors fail open for public lists and closed (503) for lists cached as
  restricted. Denials are `401 sign_in_required` / `403 forbidden` +
  `signInUrl`. Credentials are `Authorization: Bearer ttp_…` (CLI/agents) or
  the raw `Cookie` header (browser), forwarded opaque — this repo never
  parses them.
- Clients already understand the hook: `api-client` (`accessToken`,
  `whoami()` — which also reports `lastWatchlist`, the saved list the web
  app's `/` opens for a signed-in user instead of creating a new one),
  CLI (`teemtape login`,
  `TEEMTAPE_ACCESS_TOKEN`), web (private-list panel and sign-in state, only
  when `VITE_DASHBOARD_URL` is set), mock server (`MOCK_PRIVATE_TOKENS`).
- Wiring state: hook code is deployed; the production binding is
  **commented out** in `workers/api/wrangler.toml` until accounts exist in
  teemtape-pro. When enabling use `service = "teemtape-pro"` **and**
  `entrypoint = "Authz"`.

Rules: never add users, Stripe, email, or PII to this repo; never change the
public D1 schema for a Pro feature; if the contract changes, bump `v` and
update `docs/authz-contract.md` in the same PR.

## Conventions

- TypeScript, ESM, strict, `noUncheckedIndexedAccess`, `verbatimModuleSyntax`
  (`tsconfig.base.json`). Small modules; comments explain *why*; JSDoc on
  exports. Match surrounding style.
- Worker: D1 only via `workers/api/src/repo.ts` with `prepare().bind()`;
  inputs validated in `validation.ts`; `HttpError` for client errors.
  Migrations are additive (`migrations/NNNN_*.sql`), applied by the deploy
  workflow.
- Anonymous by design: no accounts, no email, tokens are capability
  bearers generated from `crypto.getRandomValues`. Never log or echo a
  watchlist token in chat or output.
- Symbols are canonical `BASE[.SUFFIX]` strings (`AAPL`, `FPH.NZ`, `BHP.AX`);
  the suffix ↔ exchange table is `packages/api-client/src/markets.ts` and is
  the only place to add a market. The symbols catalog comes from exchange /
  SEC listing files via `packages/symbols-sync` — never from Yahoo, which is
  only the on-demand delayed-quote provider for the OSS app (and not for
  Pro). Details and the licensing line: `docs/plans/multi-market.md`.
- CLI: config precedence flags > env > `~/.config/teemtape/config.json` >
  defaults; `--json` for machine output; secrets masked in `config`.
- Tests live next to code (`workers/api/test` = Vitest in workerd with
  isolated D1 and an in-process `AUTHZ` stub; `packages/*/test` = node:test
  against the mock server).
- Docs site content is in `apps/docs/src/content/docs`; update it when
  behaviour or flags change. `skills/teemtape-cli/SKILL.md` too when the CLI
  changes.

## Commands

```bash
npm install
npm run build            # api-client → cli → web
npm test                 # every workspace

npm run mock             # in-memory API on :8787 (MOCK_PRIVATE_TOKENS=… simulates private lists)
npm run api:dev          # real Worker via wrangler dev on :8787 (run migrate:local first)
npm run web:dev          # Vite on :5173 (VITE_API_URL, optional VITE_DASHBOARD_URL)
npm run cli -- --json list --token <token>

cd workers/api && npx wrangler deploy --dry-run --env production
```

`.claude/launch.json` defines `mock-api` (with a seeded private token) and
`web` for the run/preview tools.

## Deploy & release

- **API**: push to `main` → `deploy-api.yml` (tests, D1 migrations,
  `wrangler deploy --env production`) → `api.teemtape.com`.
- **Web**: push to `main` touching `apps/web/**` → `deploy-web.yml` → Pages
  project `teemtape-web` → `teemtape.com`.
- **Docs**: Cloudflare Workers Builds (git integration) builds `apps/docs`
  → Worker `teemtape-docs` → `docs.teemtape.com`. PRs get a "Workers Builds"
  check; if it fails on a docs-only change, check for stale branches first.
- **Releases**: `release.yml` (manual, opens a version-bump PR) → merging it
  triggers `tag-release.yml` (tag, GitHub release, npm publish of
  `@teemtape/api-client` then `@teemtape/cli`). npm auth is **Trusted
  Publishing (OIDC)**, no token secret: each package on npmjs.com lists this
  repo + `tag-release.yml` + environment `release` as a trusted publisher.
  The tag/release are cut only when the tag is new, but npm publish runs
  whenever npm lacks the version — so if the npm step fails, fix the cause
  and *Re-run failed jobs* on that run; for older tags, *Run workflow* with
  `tag` set. Both publish only what npm is missing and never re-tag.
  The Worker (`@teemtape/api`) is private and is not published; it ships via
  `deploy-api.yml` on the same merge. `publish-skills.yml` runs the
  `clawhub` CLI on every `skills/*` folder when `main` changes (manual runs
  dry-run by default). New versions sit in ClawHub moderation for a few
  minutes before going live; the CLI reports that as `pending-publication`
  and the workflow treats it as success.
- **Symbols catalog**: `sync-symbols.yml` (1st and 15th of the month, or
  *Run workflow* with a `markets` list / `dry_run`) builds
  `packages/symbols-sync`, fetches each market's listing, validates, applies
  the SQL with `wrangler d1 execute --remote`, then publishes the table as
  the `teemtape.catalog.v1` snapshot to KV (`symbols:catalog:v1`) that the
  Worker serves `/api/symbols` from in memory (D1 is only the fallback). The
  Worker has no cron. After a deploy that adds a market, run it by hand once.
- Secrets in GitHub Actions: `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`,
  `POLYGON_API_KEY`; optional `RELEASE_TOKEN`, `PRO_DISPATCH_TOKEN`. No npm
  token (see Releases).

## Current state (2026-09-19)

- Product: M0–M3 done (API, CLI, desktop + mobile web, docs site, skill).
- M5 multi-market: canonical symbols, pipeline with `sec`/`nzx`/`asx`/`nse`
  adapters and the fortnightly workflow are in. Next: run the workflow once
  after deploy, per-market delay badge, SGX/HKEX/Tokyo adapters
  (`docs/plans/multi-market.md` §6).
- teemtape Pro P1 (the hook) merged and deployed, unbound. Plan §5 in
  `docs/plans/paid-tier-plan.md`; market research in `docs/market-research/`.
- v1.0.0–v1.0.2 are tagged and released on GitHub but **not on npm** (npm
  still has 0.1.4, without `whoami`): npm rejected the old automation token,
  and trusted publishing is not configured on npmjs.com yet. Once it is,
  re-run the failed v1.0.2 `tag-release.yml` run. Then for Pro P2: set `VITE_DASHBOARD_URL` for
  production web and enable the binding (the `teemtape-released` dispatch is
  already in `tag-release.yml`).

## How to pick up work

Branch from `main`, open a PR, wait for CI (Workers Builds for docs;
Actions on merge for API/web), the owner merges. Commit messages: imperative
summary + short why. Don't push to `main` directly.
