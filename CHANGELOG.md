## [v1.0.3] - 2026-09-22

- Maintenance release.

## [v1.0.2] - 2026-09-22

- Maintenance release.

## [v1.0.1] - 2026-09-21

- Maintenance release.

## [v1.0.0] - 2026-09-19

- Skill update with correct package name ([#24](https://github.com/kiwifellows/teemtape/pull/24)) (@kiwifellows)
- robots ([#25](https://github.com/kiwifellows/teemtape/pull/25)) (@kiwifellows)
- Feature/ai requests ([#26](https://github.com/kiwifellows/teemtape/pull/26)) (@kiwifellows)
- Fix markdown watchlist URL routing on Cloudflare Pages. ([#27](https://github.com/kiwifellows/teemtape/pull/27)) (@kiwifellows)
- Fix /w/:token.md returning HTML on Cloudflare Pages. ([#28](https://github.com/kiwifellows/teemtape/pull/28)) (@kiwifellows)
- Updated Cloudflare pages deploy ([#22](https://github.com/kiwifellows/teemtape/pull/22)) (@kiwifellows)
- Deploy docs as a Worker with static assets ([#29](https://github.com/kiwifellows/teemtape/pull/29)) (@kiwifellows)
- teemtape Pro: plan, research brief, and market research findings ([#30](https://github.com/kiwifellows/teemtape/pull/30)) (@kiwifellows)
- Add optional AUTHZ authorisation hook (teemtape Pro P1) ([#31](https://github.com/kiwifellows/teemtape/pull/31)) (@kiwifellows)
- Enable the teemtape Pro AUTHZ binding and dashboard URL in production ([#33](https://github.com/kiwifellows/teemtape/pull/33)) (@kiwifellows)
- Add AGENTS.md/CLAUDE.md context; point AUTHZ binding at teemtape-pro ([#32](https://github.com/kiwifellows/teemtape/pull/32)) (@kiwifellows)
- Raise the production AUTHZ timeout to 1000 ms ([#34](https://github.com/kiwifellows/teemtape/pull/34)) (@kiwifellows)
- Add teemtape logo ([#35](https://github.com/kiwifellows/teemtape/pull/35)) (@kiwifellows)
- Show what a caller may do on a watchlist and explain why not ([#36](https://github.com/kiwifellows/teemtape/pull/36)) (@kiwifellows)
- Multi-market symbols: canonical IDs, symbols pipeline, fortnightly sync (M5) ([#37](https://github.com/kiwifellows/teemtape/pull/37)) (@kiwifellows)
- Symbols sync: import as a diff against the live table, not a full rewrite ([#38](https://github.com/kiwifellows/teemtape/pull/38)) (@kiwifellows)
- CLI: watchlists, use, and inbox over the teemtape Pro API ([#39](https://github.com/kiwifellows/teemtape/pull/39)) (@kiwifellows)
- Run the clawhub CLI directly in publish-skills.yml ([#40](https://github.com/kiwifellows/teemtape/pull/40)) (@kiwifellows)
- FinOps: rate-limit binding, edge-cached quotes, in-memory symbols catalog ([#41](https://github.com/kiwifellows/teemtape/pull/41)) (@kiwifellows)

## Unreleased

- perf: rate limiting moved from a KV counter to the Workers Rate Limiting binding (`RATE_LIMITER`; `RATE_LIMIT_RPM` var removed, the limit is on the binding) — no KV operations per request. `GET /api/quotes` is now served through the edge Cache API for the delay window with `cache-control: public, max-age=<delay>`, and the KV lookup is one bulk read per request instead of one per symbol. (@kiwifellows)
- perf: `GET /api/symbols` is answered from an in-memory `teemtape.catalog.v1` snapshot (KV key `symbols:catalog:v1`, published by `sync-symbols.yml` via the new `teemtape-symbols snapshot` command) and edge-cached for an hour; the D1 `LIKE` scan remains only as the fallback before the first sync. (@kiwifellows)

- feat: multi-market symbols — canonical `BASE.SUFFIX` IDs (NZX, ASX, SGX, HKEX, Tokyo, LSE, EU, India), a market registry in `@teemtape/api-client`, `EXCHANGE:TICKER` aliases, `GET /api/symbols?exchange=`, exchange/currency in search results, and `currency`/`exchange` on quotes. (@kiwifellows)
- feat: `@teemtape/symbols-sync` pipeline (SEC, NZX, ASX, NSE adapters → `teemtape.symbol.v1` NDJSON → idempotent D1 import) and the fortnightly / on-demand `sync-symbols.yml` workflow; the Worker's SEC cron is removed. See `docs/plans/multi-market.md`. (@kiwifellows)

## [v0.1.4] - 2026-06-20

- Added issue templates for bugs and feature requests. ([#18](https://github.com/kiwifellows/teemtape/pull/18)) (@kiwifellows)
- docs: Starlight documentation site for end users and agents + MIT license ([#19](https://github.com/kiwifellows/teemtape/pull/19)) (@kiwifellows)
- feat: API guardrails (rate limiting + API key), Yahoo/Stooq providers, 5-min shared quote cache ([#20](https://github.com/kiwifellows/teemtape/pull/20)) (@kiwifellows)
- Feature/link to website ([#21](https://github.com/kiwifellows/teemtape/pull/21)) (@kiwifellows)

## [v0.1.3] - 2026-06-19

- Maintenance release.

## [v0.1.2] - 2026-06-19

- Maintenance release.

## [v0.1.1] - 2026-06-19

- web: GitHub link, favicon, feedback footer, and mobile responsive layout ([#9](https://github.com/kiwifellows/teemtape/pull/9)) (@kiwifellows)
- Cursor/web frontend GitHub favicon responsive ffe4 ([#10](https://github.com/kiwifellows/teemtape/pull/10)) (@kiwifellows)
- Automated release: version bump, tag/release, and npm publish ([#11](https://github.com/kiwifellows/teemtape/pull/11)) (@kiwifellows)
- ci: release via PR + tag-on-merge (keep main protected) ([#12](https://github.com/kiwifellows/teemtape/pull/12)) (@kiwifellows)

## [API and CLI Base] - %Y->- (HEAD -> main, tag: v0.1.0, origin/main)

- Phase 1: teemtape wireframes (desktop, mobile, CLI) ([#1](https://github.com/kiwifellows/teemtape/pull/1)) (@kiwifellows)
- Planning: dev milestones + CLI scaffolding options ([#2](https://github.com/kiwifellows/teemtape/pull/2)) (@kiwifellows)
- M0 + M1: Cloudflare Worker API (D1/KV) + teemtape CLI ([#3](https://github.com/kiwifellows/teemtape/pull/3)) (@kiwifellows)
- Feature/api ([#4](https://github.com/kiwifellows/teemtape/pull/4)) (@kiwifellows)

# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and entries are generated automatically from merged pull requests when a GitHub
release is published on `main`.
