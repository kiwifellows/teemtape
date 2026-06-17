# teemtape

An open-source **ticker app for commenting on stocks**. Leave anonymous notes
next to stock symbols from the web, mobile, or the CLI. It is a hands-on tool for
learning how to build software **incrementally with agentic AI**.

> **Not a trading app.** There is no order entry or money movement — just delayed
> quotes and notes. Data is informational only.

## Status

- **Phase 1 — Wireframes:** done ([`/wireframes`](wireframes)).
- **Phase 2 — Build (in progress):** the **CLI** (milestone M1) is the first
  client, so we can exercise the API early. See [`docs/roadmap.md`](docs/roadmap.md).

### Try the CLI now

The CLI works end-to-end today against an in-memory **mock API** (no Cloudflare or
API keys needed):

```bash
npm install
npm run build
npm run mock            # terminal 1: mock API on http://localhost:8787

# terminal 2:
node packages/cli/dist/index.js list --token 6f1ed002ab5595859014ebf0951522d9
node packages/cli/dist/index.js notes NVDA --token 6f1ed002ab5595859014ebf0951522d9
node packages/cli/dist/index.js init      # create your own watchlist + token
```

See [`packages/cli/README.md`](packages/cli/README.md) for all commands.

## Repository layout

```
teemtape/
├── wireframes/            # Phase 1 HTML mockups (no build step)
├── docs/                  # architecture, roadmap, CLI options
└── packages/
    ├── api-client/        # @teemtape/api-client — shared types + typed API client
    ├── cli/               # @teemtape/cli — Commander.js CLI (milestone M1)
    └── mock-server/       # dependency-free in-memory API mock for local testing
```

This is an npm-workspaces monorepo. The real Cloudflare Worker API + D1 (M0) and
the React apps (M2+) will be added under `workers/` and `apps/` as we build them.

## Wireframes

### View the wireframes

They are plain HTML/CSS/JS with no build step. Either open the files directly or
serve the folder:

```bash
# option A: open in a browser
open wireframes/index.html        # macOS
xdg-open wireframes/index.html    # Linux

# option B: serve locally
cd wireframes && python3 -m http.server 8080
# then visit http://localhost:8080
```

| Surface | File | Notes |
| --- | --- | --- |
| Gallery | [`wireframes/index.html`](wireframes/index.html) | Overview + links to all wireframes |
| Desktop | [`wireframes/desktop.html`](wireframes/desktop.html) | Stock table, note popup, share link (built first) |
| Mobile | [`wireframes/mobile.html`](wireframes/mobile.html) | Card list + bottom-sheet notes (React → React Native) |
| CLI | [`wireframes/cli.html`](wireframes/cli.html) | How agents read the watchlist and post notes |

Try the **💬 Note** buttons and the **Copy** on the share link — the popups and
mock data are interactive. Desktop, mobile, and the gallery have a **☀️ Light /
🌙 Dark** toggle (top right) so you can review both themes; the choice is
remembered across pages.

## Features (planned)

- Table list of stocks
- Backend connects to the Polygon/Massive free API
- Quotes delayed by ~1 minute (not real-time)
- Anonymous notes on each symbol, from agents (CLI) and end users (web/mobile)
- Note popup when viewing a symbol
- Personal, shareable watchlist link with an anonymous MD5 token in the URL

## Planned stack

Cloudflare end to end (see [`docs/architecture.md`](docs/architecture.md) and the
[Cloudflare skills guide]):

- **Cloudflare Workers** — single API
- **Cloudflare D1** — notes + watchlists
- **Cloudflare KV** — short-TTL cache for delayed quotes
- **React** (desktop → mobile web) and later **React Native**
- A small **CLI** that calls the same Worker API as the apps

`wrangler.toml` with separate `dev`/`production` environments and D1/KV bindings
will be added with the Worker in Phase 2.

## Roadmap

1. **Phase 1 — Wireframes** (this PR): desktop, mobile, CLI mockups for approval.
2. **Phase 2 — Build**: Cloudflare Worker API + D1, desktop React app, CLI.
3. **Phase 3**: mobile web polish, then React Native.

## Documentation

- [`docs/architecture.md`](docs/architecture.md) — system plan, data model, API,
  and how the kiwifellows practice guides are applied.

[Cloudflare skills guide]: https://github.com/kiwifellows/ai/blob/main/docs/clouds/cloudflare.md
[feature-development practices]: https://github.com/kiwifellows/ai/blob/main/docs/practices/feature-development.md
