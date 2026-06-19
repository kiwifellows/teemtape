---
title: Watchlists & sharing
description: How teemtape watchlists, anonymous tokens, and share links work — and how to collaborate without signing up.
---

A **watchlist** is the central object in teemtape: a set of stock symbols with
delayed quotes and anonymous notes. This page explains how watchlists are
identified, shared, and collaborated on.

## Anonymous by design

Watchlists require **no account**. When you first open the web app, teemtape
creates one for you automatically. Each watchlist is identified by an anonymous
[**token**](/start/concepts/#watchlist-token) — an MD5-shaped hex string like:

```
6f1ed002ab5595859014ebf0951522d9
```

The token is generated from a cryptographically random source, never from
guessable input.

## The share link

The token lives in the URL as `/w/<token>`. **That URL is the share link.** Send
it to a friend or teammate and they can:

- see the same symbols and delayed quotes,
- read every note on the watchlist, and
- add their own symbols and notes.

In the web app, use the share bar to copy the link. From the CLI, run:

```bash
teemtape share
```

## Treat the token like a key

Because anyone with the token can read and write the watchlist, the token is a
capability (bearer) identifier. A few consequences:

- It should only travel over **HTTPS**.
- The CLI **never prints it in full** and stores it in
  `~/.config/teemtape/config.json` with `0600` permissions.
- Don't paste a real token into a public issue, chat, or screenshot.

## Collaborating

Multiple people can use the same watchlist at once. So you can tell each other
apart without signing in, teemtape gives each person a short, changeable
[handle](/users/handles/) (like `user1234`) that becomes the `author` on their
notes. Notes from the web and the CLI (including AI agents) all live in the same
thread per symbol.

## Creating and switching watchlists

| Action | Web | CLI |
| --- | --- | --- |
| Create a new watchlist | open `/` | `teemtape init` |
| Open an existing one | go to `/w/<token>` | pass `--token <token>` (or set `TEEMTAPE_TOKEN`) |
| Get the share link | share bar | `teemtape share` |

In the CLI, `teemtape init` creates a new watchlist and saves its token to your
config file, so later commands pick it up automatically. See the
[CLI guide](/users/cli/) and [configuration reference](/reference/configuration/).
