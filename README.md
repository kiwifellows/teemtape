# teemtape

An open-source **ticker app for commenting on stocks**. Leave anonymous notes
next to stock symbols from the web, mobile, or the CLI. It is a hands-on tool for
learning how to build software **incrementally with agentic AI**.

> **Not a trading app.** There is no order entry or money movement — just delayed
> quotes and notes. Data is informational only.

## Use straightaway

[https://teemtape.com](https://teemtape.com) for web/mobile version.

Install CLI (For Ops/Agents):

```
npm i @teemtape/cli -g
#setup your config and get a URL for sharing with web users
teemtape init
#search your first stock and add to your watchlist
teemtape search "Space Explo"
teemtape add SPCX
#list my watchist (all my stocks for this token)
teemtape list
#add a note for a stock
teemtape note SPCX -m "Cursor purchased for 60bn What?!!?"
#view notes for a stock (includes any other user you have shared this with)
teemtape notes SPCX
#view someone else's token
teemtape list --token <some_token_from_url>
```

## Status

- **Phase 1 — Wireframes:** done ([`/wireframes`](wireframes)).
- **Phase 2 — Build (in progress):**
  - **M0 — backend:** done — Cloudflare Worker + D1 + KV ([`workers/api`](workers/api)).
  - **M1 — CLI:** done — first client, built on the shared contract ([`packages/cli`](packages/cli)).
  - Next: iterate on the CLI, then the desktop React app (M2). See [`docs/roadmap.md`](docs/roadmap.md).

### Try it now, locally

Run the real backend locally (serves deterministic **sample** quotes with no API key):

```bash
npm install
npm run build

# terminal 1 — the Worker API (Cloudflare workerd via wrangler) on :8787
cd workers/api && npm run migrate:local && npm run dev

# terminal 2 — drive it with the CLI
TEEMTAPE_API_URL=http://127.0.0.1:8787 node packages/cli/dist/index.js init
TEEMTAPE_API_URL=http://127.0.0.1:8787 node packages/cli/dist/index.js add NVDA
TEEMTAPE_API_URL=http://127.0.0.1:8787 node packages/cli/dist/index.js list
```

Prefer no Cloudflare toolchain? A dependency-free **mock** implements the same
contract: run `npm run mock` (seeds watchlist token `6f1ed002ab5595859014ebf0951522d9`)
and point the CLI at `http://localhost:8787`. See [`packages/cli/README.md`](packages/cli/README.md).

## Repository layout

```
teemtape/
├── wireframes/            # Phase 1 HTML mockups (no build step)
├── docs/                  # architecture, roadmap, CLI options
├── packages/
│   ├── api-client/        # @teemtape/api-client — shared types + typed API client
│   ├── cli/               # @teemtape/cli — Commander.js CLI (M1)
│   └── mock-server/       # dependency-free in-memory API mock for local testing
└── workers/
    └── api/               # @teemtape/api — Cloudflare Worker + D1 + KV (M0)
```

This is an npm-workspaces monorepo. The React apps (M2+) will be added under
`apps/` as we build them.

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
- Anonymous handles (e.g. `user1234`) so collaborators on a shared watchlist can
  tell each other apart — auto-generated, changeable, no sign-in required
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

## Contributing

See [`CONTRIBUTING.md`](CONTRIBUTING.md) for local setup, development commands, pull
request guidelines, and how CI deploys the API on merges to `main`.

## Documentation

A full documentation site for **end users and agents** lives in
[`apps/docs`](apps/docs) (Astro + Starlight). Run it locally with
`npm run dev --workspace docs`. It pulls together the guides below plus web/CLI
usage, the HTTP API, and the agent skill.

- [`docs/architecture.md`](docs/architecture.md) — system plan, data model, API,
  and how the kiwifellows practice guides are applied.
- [`docs/roadmap.md`](docs/roadmap.md) — development milestones and priority for
  the CLI, desktop, and mobile surfaces.
- [`docs/cli-options.md`](docs/cli-options.md) — options for scaffolding the CLI
  (language, framework, distribution) with a recommendation, for approval.
- [`docs/releases.md`](docs/releases.md) — how releases update `CHANGELOG.md` and
  alternative automation options.

## License

teemtape is open source under the **MIT License**, Copyright (c) 2026 Benjamin
Fellows. See [`LICENSE`](LICENSE).

[Cloudflare skills guide]: https://github.com/kiwifellows/ai/blob/main/docs/clouds/cloudflare.md
[feature-development practices]: https://github.com/kiwifellows/ai/blob/main/docs/practices/feature-development.md
