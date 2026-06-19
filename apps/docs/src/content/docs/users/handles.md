---
title: Anonymous handles
description: How teemtape's sign-in-free handles let collaborators tell each other apart without accounts or personal data.
---

A **handle** is a short, human-friendly name like `user1234` that lets people
collaborating on a shared watchlist tell each other apart — **without signing
in**. It becomes the `author` on the notes you post.

## Why handles exist

teemtape watchlists are shared by a [token](/users/watchlists/) and used by
multiple people at once. Without any identity, every note would be equally
anonymous and you couldn't follow who said what. Handles solve exactly that, and
nothing more:

- They give notes an attributable author on a shared watchlist.
- They require **no email, password, or personal data**.
- They are a **display identity, not a credential** — anyone can claim any free
  handle.

## How they work

- A handle is **auto-generated and unique** (a `user1234`-style name) the first
  time you go to add a note.
- You can **change it** to anything that's still available.
- It's stored **client-side** so it persists with no sign-in:
  - the **web app** keeps it in `localStorage`,
  - the **CLI** keeps it in `~/.config/teemtape/config.json`.
- **Uniqueness is enforced server-side**: claiming a handle reserves it globally
  so two people can't use the same one.

## Rules

Handles are validated and normalized by the API:

- **3–20 characters**,
- letters, numbers, `-`, and `_` only,
- must **start with a letter**, and
- normalized to **lowercase**.

## Managing your handle in the CLI

```bash
teemtape handle                # show your current handle
teemtape handle trader_jane    # claim a specific handle (must be available)
teemtape handle --generate     # get a fresh, unique handle
```

You can also set a handle for a single command with the `--handle` flag or the
`TEEMTAPE_HANDLE` environment variable. See the
[configuration reference](/reference/configuration/).

## Fallback authors

If a note is posted without a handle, teemtape falls back to:

- `agent-cli` for notes with `source: "cli"`, and
- a short `anon-xxxxxx` label derived from the watchlist token for web notes.
