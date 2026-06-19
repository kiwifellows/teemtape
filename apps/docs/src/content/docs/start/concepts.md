---
title: Key concepts
description: The core ideas behind teemtape — watchlists, anonymous tokens, handles, notes, delayed quotes, and the shared API contract.
---

A few terms come up across every teemtape surface. Understanding them makes the
rest of the docs click into place.

## Watchlist

A **watchlist** is a list of stock symbols. It's the central object in teemtape:
quotes and notes hang off the symbols in a watchlist. A watchlist is created
anonymously — no account needed — and is identified by a token (below).

## Watchlist token

Every watchlist is identified by an anonymous **token**, an MD5-shaped hex string
such as `6f1ed002ab5595859014ebf0951522d9`. The token:

- lives in the share URL as `/w/<token>`,
- **is** the share link — anyone with it can read and add to that watchlist,
- is generated from a cryptographically random source, and
- is a capability/bearer identifier, so it should only travel over HTTPS.

Because the token grants access, the CLI never prints it in full and stores it
with restrictive file permissions. See [watchlists & sharing](/users/watchlists/).

## Anonymous handle

A **handle** (like `user1234`) is a short, sign-in-free display name so
collaborators on a shared watchlist can tell each other apart. It is:

- **auto-generated and unique** the first time you go to post a note,
- **changeable** to any other available value,
- stored **client-side** (browser `localStorage`, or the CLI config file), and
- used as the `author` on the notes you post.

A handle is a display identity, **not** a credential — anyone can claim any free
handle. See [anonymous handles](/users/handles/).

## Note

A **note** is a short piece of anonymous commentary attached to a
`(watchlist, symbol)` pair. Notes carry:

- an `author` (your handle, or a fallback like `anon-xxxxxx` / `agent-cli`),
- a `source` of `web` or `cli`, so the UI can show where it came from, and
- a timestamp.

Notes from every surface live together: a note posted from the CLI appears in
the web app's note popup, and vice versa.

## Delayed quote

teemtape shows **delayed quotes** — price, change, and percent change — that are
intentionally held back by about a minute (the delay is configurable, minimum 60
seconds). Quotes are cached in Cloudflare KV to respect the upstream provider's
free-tier rate limits. The delay is surfaced in the UI so it's never mistaken for
real-time data. teemtape is **not** a trading tool.

## Source: `web` vs `cli`

Every note records the `source` it was posted from. The web app posts `web`;
the CLI posts `cli`. This is the only difference between a human note and an
agent note — there is no special backend path for agents. The web UI uses the
source to badge agent (CLI) notes.

## The shared contract

All clients — web, CLI, and future mobile — talk to **one** Cloudflare Worker
API through a single shared TypeScript client, `@teemtape/api-client`. There's no
separate "agent API": agents just use the same endpoints with structured
(`--json`) output. See the [HTTP API reference](/reference/api/) and the
[architecture](/reference/architecture/).
