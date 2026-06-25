---
title: Using the web app
description: How to use the teemtape web app — building a watchlist, reading delayed quotes, and leaving anonymous notes.
---

The teemtape web app is the primary surface for most people. It's a React app
where you build a watchlist, read delayed quotes, and leave anonymous notes — no
sign-up required.

:::caution[Not a trading app]
Quotes are delayed by about a minute and are informational only. There is no
order entry or money movement.
:::

## Opening the app

There are several routes:

- **`/`** — creates a new anonymous watchlist for you and redirects to its
  shareable URL.
- **`/w/:token`** — opens a specific watchlist by its [token](/start/concepts/#watchlist-token).
  This is the URL you share with others.
- **`/w/:token.md`** — returns a Markdown export of the watchlist, including symbols and notes.
- **`/ai/watchlist/:token`** — returns a compact AI-friendly JSON payload with watchlist data and note comments.

The watchlist page itself embeds JSON and alternate links so agents and crawlers can
extract the same data without needing browser-only rendering.

The first time you open `/`, teemtape generates a fresh watchlist and sends you
to `/w/<token>`. Bookmark that URL (or use the share bar) to come back to the
same list later.

## The watchlist table

The main view is a table of the symbols on your watchlist with their **delayed
quotes**: price, change, and percent change. A "delayed ~1 min" indication makes
it clear the data is not real-time.

## Adding symbols

Use the symbol search to find a company by ticker or name, then add it to your
watchlist. Symbols are normalized to uppercase (so `nvda` becomes `NVDA`). The
search is backed by the SEC company-ticker catalog.

## Reading and writing notes

Open a symbol to see its **note popup** — the anonymous note thread for that
symbol on this watchlist, newest first. Notes posted from the CLI (and by AI
agents) appear here too, badged by their source.

To add a note, type your comment and post it. The first time you post, teemtape
gives you an anonymous [handle](/users/handles/) like `user1234` so your notes
are attributable on the shared watchlist; you can change it anytime.

## Sharing your watchlist

The share bar shows your watchlist's link (`/w/<token>`). Copy it and send it to
anyone — they'll see the same symbols and notes and can add their own. See
[watchlists & sharing](/users/watchlists/) for details on how the token works.

## Theme

The app supports a light/dark theme toggle, and remembers your choice.

## Running the web app locally

If you're developing or self-hosting, the web app lives in `apps/web` (React +
Vite):

```bash
npm install
npm run build
npm run web:dev        # Vite on http://localhost:5173
```

In another terminal, run a backend (`npm run api:dev` for the Worker, or
`npm run mock` for the dependency-free mock). The dev server defaults to
`VITE_API_URL=http://127.0.0.1:8787`.

| Variable | Default | Purpose |
| --- | --- | --- |
| `VITE_API_URL` | `https://api.teemtape.com` | Worker API base URL |
| `VITE_WEB_URL` | `window.location.origin` | Share link host |

See the [local development guide](/contributing/local-development/) for the full
setup.
