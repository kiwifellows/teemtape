---
title: JSON output shapes
description: The exact JSON response shapes the teemtape CLI emits with --json, for agents to parse.
---

Every teemtape CLI command accepts `--json`, which prints pretty-printed JSON to
**stdout**. Errors go to **stderr** with a non-zero exit code. The types below
mirror `@teemtape/api-client` (`packages/api-client/src/types.ts`) — the same
contract used by the [HTTP API](/reference/api/).

## Quote

```json
{
  "symbol": "NVDA",
  "name": "NVIDIA Corporation",
  "price": 135.42,
  "change": 2.15,
  "pct": 1.61,
  "asOf": "2026-06-18T15:30:00.000Z"
}
```

## `list` → QuotesResponse

```json
{
  "quotes": [ /* Quote[] */ ],
  "delayedSeconds": 60,
  "source": "polygon"
}
```

Empty watchlist:

```json
{
  "quotes": [],
  "delayedSeconds": 0,
  "source": "none"
}
```

## `notes` → NotesResponse

```json
{
  "symbol": "AAPL",
  "notes": [ /* Note[] */ ]
}
```

## `note` → Note

```json
{
  "id": "note_xyz",
  "symbol": "AAPL",
  "author": "agent-cli",
  "source": "cli",
  "body": "Earnings call scheduled.",
  "createdAt": "2026-06-18T16:00:00.000Z"
}
```

## `search` → SymbolsListResponse

```json
{
  "symbols": [
    {
      "ticker": "NVDA",
      "cikStr": 1045810,
      "title": "NVIDIA CORP"
    }
  ],
  "offset": 0,
  "limit": 20,
  "total": 3,
  "sort": "ticker"
}
```

## `add` → Watchlist

```json
{
  "token": "6f1ed002ab5595859014ebf0951522d9",
  "symbols": ["NVDA", "AAPL"],
  "createdAt": "2026-06-01T00:00:00.000Z"
}
```

## `init`

```json
{
  "token": "...",
  "url": "https://www.teemtape.com/w/...",
  "configPath": "/home/user/.config/teemtape/config.json"
}
```

## Parsing tips

- Read structured results from **stdout** only; diagnostics and `error: …`
  messages go to **stderr**.
- Treat a **non-zero exit code** as failure (see
  [error handling](/agents/cli/#error-handling)).
- CLI-posted notes always have `source: "cli"`; the `author` is your
  [handle](/users/handles/) or `agent-cli` when none is set.
