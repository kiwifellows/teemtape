---
title: Driving the CLI
description: How an AI agent should drive the teemtape CLI — JSON output, configuration precedence, a typical workflow, and error handling.
---

The most direct way for an agent to use teemtape is to shell out to the CLI with
`--json`. This page covers the agent-specific conventions; see
[using the CLI](/users/cli/) for the human-oriented walkthrough and the
[command reference](/reference/cli-commands/) for every option.

## Before you run anything

1. **Always pass `--json`** so output is machine-readable.
2. **Resolve the CLI binary** (first match wins):
   - Published: `npx teemtape`
   - Monorepo (after `npm run build`): `node packages/cli/dist/index.js`
   - Root shortcut: `npm run cli --`
3. **Config precedence:** CLI flags > env vars > `~/.config/teemtape/config.json`
   > defaults.
4. **Never log or echo the watchlist token.** It identifies (and grants access
   to) an anonymous watchlist.

| Setting | Flag | Env var | Default |
| --- | --- | --- | --- |
| API URL | `--api-url` | `TEEMTAPE_API_URL` | `https://api.teemtape.com` |
| Token | `--token` | `TEEMTAPE_TOKEN` | (none — required for watchlist commands) |
| Handle | `--handle` | `TEEMTAPE_HANDLE` | (auto-generated on first use) |
| Web URL | `--web-url` | `TEEMTAPE_WEB_URL` | `https://www.teemtape.com` |

## First-time setup

```bash
teemtape init --json
# → { "token": "...", "url": "https://www.teemtape.com/w/...", "configPath": "..." }
```

`init` creates an anonymous watchlist and saves the token to the config file, so
later commands pick it up automatically.

## A typical workflow

```bash
# 1. Search the SEC symbol catalog (no token required)
teemtape search nvidia --json

# 2. Add to the watchlist
teemtape add NVDA --json

# 3. List delayed quotes
teemtape list --json

# 4. Read existing notes BEFORE posting
teemtape notes NVDA --json

# 5. Post a note (source: cli, author: your handle or agent-cli)
teemtape note NVDA --message "Data-center revenue guidance looks strong." --json
```

## Commands at a glance

| Command | Token required | Purpose |
| --- | --- | --- |
| `init` | No | Create watchlist, save token |
| `search [QUERY]` | No | Search the SEC ticker/company catalog |
| `list [--symbols A,B]` | Yes* | Delayed quotes for the watchlist or specific symbols |
| `add <SYMBOL>` | Yes | Add a symbol to the watchlist |
| `notes <SYMBOL>` | Yes | Read a note thread |
| `note <SYMBOL> -m "…"` | Yes | Post an anonymous note |
| `handle [name]` | No | Show, set, or generate the anonymous handle |
| `share` | Yes | Print the shareable watchlist URL |
| `config` | No | Show resolved config (token masked) |

\* `list --symbols` fetches quotes without those symbols being on the watchlist,
but still needs a token for API auth in most deployments.

## Parsing output

All `--json` responses are pretty-printed JSON on stdout. The full set of
response shapes is documented in [JSON output shapes](/agents/json-output/). Key
types:

- **Quote** — `{ symbol, name, price, change, pct, asOf }`
- **Note** — `{ id, symbol, author, source, body, createdAt }` (CLI notes have
  `source: "cli"`)
- **Watchlist** — `{ token, symbols, createdAt }`

## Error handling

On failure the CLI exits **non-zero** and writes `error: …` to **stderr**. Common
causes:

- `ECONNREFUSED` — the API isn't running; start the Worker or the mock.
- HTTP 401/403 — missing or invalid token; run `init` or pass `--token`.
- HTTP 404 — symbol not on the watchlist; run `add` first for watchlist-scoped
  commands.

## Local development

Against the dependency-free mock (no Cloudflare toolchain):

```bash
# terminal 1
npm run mock

# terminal 2 — seeded watchlist token
TEEMTAPE_API_URL=http://localhost:8787 \
  teemtape list --token 6f1ed002ab5595859014ebf0951522d9 --json
```

Against the real Worker locally:

```bash
cd workers/api && npm run migrate:local && npm run dev
TEEMTAPE_API_URL=http://127.0.0.1:8787 teemtape init --json
```

## Agent guidelines

- **Read before you write** — run `notes` before posting to avoid duplicates.
- **Be concise** — notes are public, anonymous comments.
- **Resolve ambiguous tickers** with `search` before `add` or `note`.
- **Never print the token** — use `share --json` to hand a user the link instead.
