# teemtape — Development Milestones & Priority

> Status: **planning / for approval.** This document proposes the build order for
> the CLI, desktop, and mobile surfaces. It follows the kiwifellows
> [feature-development] and [architecture] practices: ship the smallest useful
> increment, build a shared foundation once, and avoid re-work (wastage).
>
> Phase 1 (wireframes) is complete and merged — see
> [`docs/architecture.md`](architecture.md) and [`/wireframes`](../wireframes).

## Guiding principles for sequencing

1. **Build the shared foundation once.** All three clients (CLI, desktop, mobile)
   talk to the *same* Cloudflare Worker API and the *same* anonymous notes/watchlist
   model. Building that backend first means each client is thin and no client work
   is thrown away ([architecture]: clear boundaries, [integration]: one simple
   contract reused by all clients).
2. **Cheapest validation first.** The CLI is the thinnest client — no rendering,
   no responsive layout, no app-store/build pipeline. It is the fastest way to
   exercise and prove the API, and it immediately unblocks the "agents post notes"
   use case.
3. **Then the primary human surface.** Desktop web is where most end users will
   read the table and leave notes, so it comes next.
4. **Reuse, don't rebuild.** Mobile web reuses the desktop React components and
   design tokens (already defined in the wireframes). React Native comes last and
   reuses the shared API client + types again.
5. **Each milestone is shippable and demoable on its own.**

## Proposed priority (highest first)

| # | Milestone | Surface | Why this order |
| - | --------- | ------- | -------------- |
| **M0** | Backend API foundation | Worker + D1 + KV | Prerequisite for every client. Nothing ships without it. |
| **M1** | CLI | CLI | Thinnest client; validates the API; enables agentic notes immediately. |
| **M2** | Desktop web (read + notes) | React web | Primary end-user surface. |
| **M3** | Mobile web | React web (responsive) | Reuses M2 components + tokens; small incremental delta. |
| **M4** | React Native app | RN | Reuses shared API client/types; highest-cost packaging, lowest urgency. |

> **Note on the original "desktop first" steer.** Phase-1 framing said desktop
> first. The only change here is slotting the **CLI ahead of desktop**, because it
> is genuinely the lowest-effort client and the fastest way to prove M0 works end
> to end (and you asked to start building the CLI next). M0+M1 together are still a
> small amount of work and de-risk the desktop build. If you'd rather keep desktop
> strictly first, we swap M1 and M2 — the milestones are otherwise unchanged.

---

## M0 — Backend API foundation

The shared spine. Built as a single Cloudflare Worker (modular monolith, per
[architecture]).

**Deliverables**
- `workers/api` Worker project with `wrangler.toml` (separate `[env.dev]` /
  `[env.production]`, D1 + KV bindings, `[vars]`), per the [Cloudflare guide].
- D1 schema + first migration for `watchlist` and `note` (see
  [`docs/architecture.md`](architecture.md)).
- Endpoints: `GET /api/quotes`, `GET/POST /api/w/:token`,
  `GET/POST /api/w/:token/notes`.
- Polygon/Massive quote proxy with **~1-minute delay** and a short-TTL KV cache
  (respect free-tier rate limits — [integration]).
- Anonymous MD5 watchlist-token generation (crypto-random) — [security].
- A shared `@teemtape/api-client` package (typed fetch wrapper) so every client
  reuses one contract.

**Definition of done**
- `wrangler dev` serves the endpoints locally against a local D1.
- A note can be created and read back; quotes return delayed data.
- Parameterised D1 queries; secrets via `wrangler secret put` (no keys in repo).

## M1 — CLI

The thinnest client. Lets agents and power users `list`, read `notes`, and `note`
on symbols, plus get a `share` link.

**Deliverables**
- `packages/cli` (TypeScript) using the framework chosen in
  [`docs/cli-options.md`](cli-options.md).
- Commands: `teemtape list`, `teemtape notes <SYMBOL>`, `teemtape note <SYMBOL> --message`,
  `teemtape share`, plus `--token`/config for which watchlist to use.
- Uses the shared `@teemtape/api-client`; notes are posted with `source: "cli"`
  so the web UI shows the agent badge.
- `npx teemtape` usable without a global install.

**Definition of done**
- Commands run against `wrangler dev` and a deployed dev Worker.
- Matches the CLI wireframe (`wireframes/cli.html`).
- Help text + non-zero exit codes on errors; no secrets logged.

## M2 — Desktop web (read + notes)

The primary human surface, matching `wireframes/desktop.html`.

**Deliverables**
- `apps/web` React app (Vite) with the design tokens from the wireframes.
- Stock table, note popup, anonymous MD5 share-link bar, "Delayed ~1 min" badge.
- Light/dark theme (already prototyped).
- Reuses `@teemtape/api-client`.

**Definition of done**
- Reads delayed quotes + notes from the Worker; can post a note.
- Share link round-trips (open `/w/:token` → see that watchlist).
- Keyboard-accessible popup; passes basic a11y checks ([design]).

## M3 — Mobile web

Responsive pass on the M2 app, matching `wireframes/mobile.html` (card list +
bottom-sheet notes). Mostly layout/interaction reuse — small delta over M2.

**Definition of done**
- Usable on phone widths; bottom-sheet notes flow works; tokens shared with M2.

## M4 — React Native app

Native shell reusing the shared API client and types. Highest packaging cost
(stores, native builds), lowest urgency — done once the web product is validated.

**Definition of done**
- Watchlist + notes + share link working on iOS/Android via the same API.

---

## What we are explicitly NOT doing yet

Per [feature-development] / [product] (avoid building "just in case"):

- No accounts/auth (notes stay anonymous via the share token).
- No real-time quotes (the ~1-min delay is intentional).
- No trading/order features — teemtape is for commenting only.
- No multi-region, queues, or durable objects until there's evidence we need them.

[feature-development]: https://github.com/kiwifellows/ai/blob/main/docs/practices/feature-development.md
[architecture]: https://github.com/kiwifellows/ai/blob/main/docs/practices/architecture.md
[integration]: https://github.com/kiwifellows/ai/blob/main/docs/practices/integration.md
[security]: https://github.com/kiwifellows/ai/blob/main/docs/practices/security.md
[design]: https://github.com/kiwifellows/ai/blob/main/docs/practices/design.md
[product]: https://github.com/kiwifellows/ai/blob/main/docs/practices/product.md
[Cloudflare guide]: https://github.com/kiwifellows/ai/blob/main/docs/clouds/cloudflare.md
