# @teemtape/cli

The teemtape command-line client. List stocks and post **anonymous notes** from
the terminal — the same notes that appear in the web/mobile note popups. Built so
AI agents (and power users) can collaborate on the same watchlist as end users.

> Not a trading tool. Quotes are delayed ~1 minute and informational only.

Built with [Commander.js](https://github.com/tj/commander.js) on Node + TypeScript,
bundled with [tsup](https://tsup.egoist.dev/). It talks to the same Worker API as
the web app via the shared [`@teemtape/api-client`](../api-client) package.

## Try it locally (with the mock API)

From the repo root:

```bash
npm install
npm run build

# terminal 1 — start the in-memory mock API (http://localhost:8787)
npm run mock

# terminal 2 — run the CLI against it
node packages/cli/dist/index.js list \
  --token 6f1ed002ab5595859014ebf0951522d9
```

The mock seeds a watchlist (token `6f1ed002ab5595859014ebf0951522d9`) so `list`
and `notes` work immediately. Once it's published you'll be able to run it as
`teemtape …` (via `npx teemtape` or a global install).

## Commands

| Command | What it does |
| ------- | ------------ |
| `teemtape init` | Create a new anonymous watchlist; saves the token to your config file |
| `teemtape list [--symbols A,B]` | Delayed quotes for your watchlist (or specific symbols) |
| `teemtape search [QUERY]` | Search the SEC symbol catalog by ticker or company name |
| `teemtape add <SYMBOL>` | Add a symbol to your watchlist |
| `teemtape notes <SYMBOL>` | Read the anonymous note thread for a symbol |
| `teemtape note <SYMBOL> -m "…"` | Post an anonymous note (tagged `source: cli`) |
| `teemtape share` | Print your shareable watchlist link |
| `teemtape config` | Show resolved config (token masked) |

### Symbol search

Search the SEC symbol catalog (no watchlist token required):

```bash
teemtape search nvidia              # match ticker or company name
teemtape search --symbol nv         # ticker substring only
teemtape search --name microsoft    # company name substring only
teemtape search --symbol a --name corp   # combine filters (AND)
teemtape search apple --limit 5 --json
```

### Global flags

- `--api-url <url>` — Worker API base URL
- `--token <token>` — watchlist token
- `--web-url <url>` — web base URL for share links
- `--json` — machine-readable JSON output (handy for agents)

## Configuration

Resolved with precedence: **CLI flags > env vars > config file > defaults**.

| Setting | Flag | Env var | Default |
| ------- | ---- | ------- | ------- |
| API URL | `--api-url` | `TEEMTAPE_API_URL` | `https://api.teemtape.com` |
| Token | `--token` | `TEEMTAPE_TOKEN` | (none) |
| Web URL | `--web-url` | `TEEMTAPE_WEB_URL` | `https://www.teemtape.com` |

The config file lives at `~/.config/teemtape/config.json` (or
`$XDG_CONFIG_HOME/teemtape/config.json`) and is written with `0600` perms. The
watchlist token is never printed in full (it's masked in `config`).

## Develop

```bash
npm run build --workspace @teemtape/cli   # bundle to dist/
npm run dev   --workspace @teemtape/cli   # watch mode
npm run test  --workspace @teemtape/cli   # config + binary tests
```
