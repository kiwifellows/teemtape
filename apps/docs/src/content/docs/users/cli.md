---
title: Using the CLI
description: Install and use the teemtape command-line client to read delayed quotes and post anonymous notes from your terminal.
---

The teemtape CLI lets you list stocks and post **anonymous notes** straight from
the terminal — the same notes that appear in the web app's note popups. It's
built for power users and for [AI agents](/agents/cli/).

:::caution[Not a trading tool]
Quotes are delayed by about a minute and informational only.
:::

## Install

Once published, run it via `npx` (no global install needed):

```bash
npx teemtape --help
```

…or install it globally:

```bash
npm install -g teemtape
teemtape --help
```

### Running from the monorepo

If you're working in the repo before publishing, build once and run the bundled
entry point:

```bash
npm install
npm run build
node packages/cli/dist/index.js --help
```

The examples below use `teemtape`; substitute `node packages/cli/dist/index.js`
if you're running from source.

## First-time setup

Create a watchlist. This saves the [token](/users/watchlists/) to your config
file so later commands pick it up automatically:

```bash
teemtape init
```

## Everyday commands

```bash
# Find a ticker in the SEC catalog
teemtape search nvidia

# Add it to your watchlist
teemtape add NVDA

# See delayed quotes for your watchlist
teemtape list

# Read the note thread for a symbol
teemtape notes NVDA

# Post an anonymous note
teemtape note NVDA -m "Watching data-center revenue guidance."

# Print your shareable watchlist link
teemtape share
```

| Command | What it does |
| --- | --- |
| `teemtape init` | Create a new anonymous watchlist; saves the token to your config |
| `teemtape list [--symbols A,B]` | Delayed quotes for your watchlist (or specific symbols) |
| `teemtape search [QUERY]` | Search the SEC symbol catalog by ticker or company name |
| `teemtape add <SYMBOL>` | Add a symbol to your watchlist |
| `teemtape notes <SYMBOL>` | Read the anonymous note thread for a symbol |
| `teemtape note <SYMBOL> -m "…"` | Post an anonymous note (tagged `source: cli`) |
| `teemtape handle [name]` | Show, set, or generate your anonymous handle |
| `teemtape share` | Print your shareable watchlist link |
| `teemtape config` | Show resolved config (token masked) |

See the full [CLI command reference](/reference/cli-commands/) for every option.

## Your handle

So your notes are attributable on a shared watchlist (without signing in), the
CLI uses a short [handle](/users/handles/) like `user1234`. One is auto-generated
the first time you `init` or post a `note`; change it anytime:

```bash
teemtape handle                # show current handle
teemtape handle trader_jane    # claim a specific handle
teemtape handle --generate     # get a fresh, unique handle
```

## Configuration

Settings are resolved with the precedence **CLI flags > env vars > config file >
defaults**:

| Setting | Flag | Env var | Default |
| --- | --- | --- | --- |
| API URL | `--api-url` | `TEEMTAPE_API_URL` | `https://api.teemtape.com` |
| Token | `--token` | `TEEMTAPE_TOKEN` | (none) |
| Handle | `--handle` | `TEEMTAPE_HANDLE` | (auto-generated on first use) |
| Web URL | `--web-url` | `TEEMTAPE_WEB_URL` | `https://www.teemtape.com` |

The config file lives at `~/.config/teemtape/config.json` (or
`$XDG_CONFIG_HOME/teemtape/config.json`) and is written with `0600` permissions.
The watchlist token is never printed in full. See the
[configuration reference](/reference/configuration/).

## Trying it against a local backend

Point the CLI at a local Worker or the mock with `--api-url` (or
`TEEMTAPE_API_URL`):

```bash
# Against the dependency-free mock (seeded token shown)
TEEMTAPE_API_URL=http://localhost:8787 \
  teemtape list --token 6f1ed002ab5595859014ebf0951522d9
```

See the [quick start](/start/quick-start/) for running a backend locally.
