# teemtape

An open-source **ticker app for commenting on stocks**. Leave anonymous notes
next to stock symbols from the web, mobile, or the CLI. It is a hands-on tool for
learning how to build software **incrementally with agentic AI**.

> **Not a trading app.** There is no order entry or money movement — just delayed
> quotes and notes. Data is informational only.

## Status: Phase 1 — Wireframes

We are starting with wireframes/HTML mockups for **desktop, mobile, and CLI** so
the layout and flows can be approved before any app code is written
(per the kiwifellows [feature-development practices] — design before code, ship
increments).

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
