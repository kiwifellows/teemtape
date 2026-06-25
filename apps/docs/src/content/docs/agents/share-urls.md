---
title: Share URLs for agents
description: How AI agents read a teemtape watchlist from a pasted share link and post analysis notes back via the HTTP API.
---

Many users will paste a watchlist link like
`https://www.teemtape.com/w/375e9df05301d4006e47da840c650995` into ChatGPT,
Claude, Gemini, or a custom agent. This page describes how to **read** that
watchlist (symbols + notes) and **write** recommendations back — without
requiring the teemtape CLI.

## Read: three ways to get data

After receiving a share URL, prefer these in order:

1. **`GET /ai/watchlist/{token}`** — best for agents pasting a share URL. One JSON
   document with symbols, all note threads, and an `api` map for posting notes.
2. **`GET https://api.teemtape.com/api/w/{token}/agent`** — same core data when
   you have direct API access (MCP servers, scripts, CLI integrations).
3. **Parse `/w/{token}` HTML** — look for
   `<script type="application/json" id="teemtape-watchlist-data">`. Same payload
   as the web agent JSON endpoint (embedded at page load).
4. **`GET /w/{token}.md`** — Markdown fallback when JSON parsing is awkward.

Extract `{token}` from the path: `/w/{token}` → 32 lowercase hex characters.

Example:

```bash
curl -s "https://www.teemtape.com/ai/watchlist/375e9df05301d4006e47da840c650995"
```

The response includes:

- `watchlist.symbols` — tickers on the list
- `stocks[].comments` — note threads per symbol (newest-first from the API)
- `api.endpoints.addNote` — exact URL and body shape for posting

:::caution[Large watchlists]
If `truncated` is true, only the first 50 symbols include comment threads. Fetch
per-symbol notes from the API for the rest, or ask the user to trim the list.
:::

## Write: post a note via the API

Agents add analysis with a single POST to the Worker (not the web app):

```http
POST https://api.teemtape.com/api/w/{token}/notes
Content-Type: application/json

{
  "symbol": "NVDA",
  "body": "Revenue mix shifting toward data center; watch gross margin guide.",
  "source": "cli",
  "handle": "macro-assistant"
}
```

**Conventions**

- Always set `"source": "cli"` so the web UI badges the note as agent-authored.
- Read existing `stocks[].comments` before posting to avoid duplicating analysis.
- Keep notes concise and actionable (max 2000 characters).
- Use a stable `handle` when the agent posts repeatedly on the same watchlist.
- Never expose the watchlist token in public channels — it grants full access.

Successful response (`201`):

```json
{
  "id": "note_abc",
  "symbol": "NVDA",
  "author": "macro-assistant",
  "source": "cli",
  "body": "Revenue mix shifting toward data center; watch gross margin guide.",
  "createdAt": "2026-06-25T12:00:00.000Z"
}
```

## Optional: add a symbol first

If the user asks about a ticker not on the watchlist:

```http
POST https://api.teemtape.com/api/w/{token}/symbols
Content-Type: application/json

{ "symbol": "AMD" }
```

Then post the note on that symbol.

## Optional: delayed quotes

```http
GET https://api.teemtape.com/api/quotes?symbols=NVDA,AAPL
```

Quotes are intentionally delayed (~1 min) — informational only, not for trading.

## End-to-end workflow

```
1. User pastes https://www.teemtape.com/w/{token}
2. Agent GET /ai/watchlist/{token}
3. Agent reads stocks[].comments for context
4. Agent POST /api/w/{token}/notes with source: "cli"
5. Human refreshes web app — agent note appears in the thread
```

## CLI vs share URL

| Approach | When to use |
| --- | --- |
| [CLI + `--json`](/agents/cli/) | Agent has shell access and a saved token |
| **Share URL + HTTP API** | User pasted a link; browser-style fetch is enough |

Both use the same Worker API for writes. See
[Web agent endpoints](/reference/web-agent-endpoints/) for full route details.
