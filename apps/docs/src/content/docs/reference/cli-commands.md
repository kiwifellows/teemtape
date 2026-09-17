---
title: CLI commands
description: Full command reference for the teemtape CLI — global flags and every subcommand.
---

The complete reference for the teemtape CLI. For a guided introduction see
[using the CLI](/users/cli/) (end users) or [driving the CLI](/agents/cli/)
(agents).

## Global flags

These apply to every command:

```
--api-url <url>    Worker API base URL (env: TEEMTAPE_API_URL)
--token <token>    Watchlist token (env: TEEMTAPE_TOKEN)
--handle <name>    Anonymous handle for posted notes (env: TEEMTAPE_HANDLE)
--web-url <url>    Web app URL for share links (env: TEEMTAPE_WEB_URL)
--access-token <pat>  teemtape Pro access token (env: TEEMTAPE_ACCESS_TOKEN)
--dashboard-url <url> teemtape Pro app URL (env: TEEMTAPE_DASHBOARD_URL)
--json             Machine-readable JSON output (use this for agent workflows)
```

See the [configuration reference](/reference/configuration/) for how settings are
resolved.

## init

Create a new anonymous watchlist and persist the token locally.

```bash
teemtape init [--json]
```

```json
{
  "token": "6f1ed002ab5595859014ebf0951522d9",
  "url": "https://www.teemtape.com/w/6f1ed002ab5595859014ebf0951522d9",
  "configPath": "/home/user/.config/teemtape/config.json"
}
```

## search

Search the SEC symbol catalog. Does **not** require a watchlist token.

```bash
teemtape search [QUERY] [options] [--json]

Options:
  --symbol <text>   Filter by ticker substring only
  --name <text>     Filter by company name substring only
  --limit <n>       Max results (default 20, max 100)
  --offset <n>      Skip first n matches (pagination)
  --sort <field>    ticker | title (default: ticker)
```

Combine `--symbol` and `--name` with AND logic. A positional `QUERY` matches
either field.

## list

Show delayed quotes.

```bash
teemtape list [--symbols A,B] [--json]
```

Without `--symbols`, it fetches the current watchlist symbols first. With
`--symbols`, it quotes those tickers directly (comma-separated, case-insensitive).

## add

Add a ticker to the watchlist. The symbol is normalized to uppercase.

```bash
teemtape add <SYMBOL> [--json]
```

## notes

Read the anonymous note thread for a symbol (newest first).

```bash
teemtape notes <SYMBOL> [--json]
```

## note

Post an anonymous note. CLI notes are tagged `source: "cli"` and attributed to
your [handle](/users/handles/) (or `agent-cli` if none is set).

```bash
teemtape note <SYMBOL> --message "<text>" [--json]
# shorthand:
teemtape note <SYMBOL> -m "<text>" [--json]
```

## handle

Show, set, or generate your anonymous handle.

```bash
teemtape handle                # show current handle
teemtape handle <name>         # claim a specific handle (must be available)
teemtape handle --generate     # get a fresh, unique handle
```

## share

Print the shareable watchlist link.

```bash
teemtape share [--json]
```

## config

Show the resolved configuration. The token is masked.

```bash
teemtape config [--json]
```

## Output and exit codes

- `--json` writes pretty-printed JSON to **stdout**; see
  [JSON output shapes](/agents/json-output/).
- Errors are written to **stderr** as `error: …` with a **non-zero** exit code.

## login

Save a teemtape Pro personal access token so the CLI (and any agent driving
it) can open private watchlists and act with the role the owner granted.

```bash
teemtape login [ACCESS_TOKEN] [--json]
```

Create the token in the teemtape Pro app first. If you omit the argument the
CLI prompts for it. The token is verified against `GET /api/whoami` before it
is saved to the config file (`0600`); `teemtape config` shows it masked.

```json
{ "handle": "trader_jane", "accessToken": "****", "configPath": "/home/user/.config/teemtape/config.json" }
```

Without a valid token, private watchlists answer:

```
error: this watchlist is private — sign in to continue (HTTP 401)
  This watchlist is private. Run `teemtape login` (sign in at https://app.teemtape.com).
```

## logout

Forget the saved access token.

```bash
teemtape logout [--json]
```
