---
title: Configuration
description: How to configure the teemtape CLI, web app, and Worker API — flags, environment variables, config files, and secrets.
---

This page collects the configuration knobs across teemtape's surfaces.

## CLI

Settings are resolved with the precedence **CLI flags > environment variables >
config file > defaults**.

| Setting | Flag | Env var | Default |
| --- | --- | --- | --- |
| API URL | `--api-url` | `TEEMTAPE_API_URL` | `https://api.teemtape.com` |
| Token | `--token` | `TEEMTAPE_TOKEN` | (none) |
| Handle | `--handle` | `TEEMTAPE_HANDLE` | (auto-generated on first use) |
| Web URL | `--web-url` | `TEEMTAPE_WEB_URL` | `https://www.teemtape.com` |

### Config file

The CLI stores config at `~/.config/teemtape/config.json` (or
`$XDG_CONFIG_HOME/teemtape/config.json`), written with **`0600`** permissions. It
holds your watchlist token and handle. The token is **never printed in full** —
`teemtape config` masks it.

`teemtape init` creates a watchlist and writes its token here so subsequent
commands pick it up automatically.

## Web app

Build-time variables (Vite):

| Variable | Default | Purpose |
| --- | --- | --- |
| `VITE_API_URL` | `https://api.teemtape.com` | Worker API base URL |
| `VITE_WEB_URL` | `window.location.origin` | Share link host |

In development, `apps/web/.env.development` defaults `VITE_API_URL` to
`http://127.0.0.1:8787`. Production values live in `apps/web/.env.production`.

## Worker API

Non-secret config lives in `workers/api/wrangler.toml` under `[vars]` and
`[env.production.vars]`.

| Variable | Purpose |
| --- | --- |
| `QUOTES_PROVIDER` | `sample` (default, no key) or `polygon` |
| `QUOTE_DELAY_SECONDS` | Quote delay / KV cache TTL (minimum 60) |
| `SEC_USER_AGENT` | Contact email for the SEC fair-access policy |

### Secrets

Secrets are **never committed**.

- **Local dev** (`wrangler dev`): put secrets in `workers/api/.dev.vars`
  (gitignored). Copy the example and add your key:

  ```bash
  cd workers/api
  cp .dev.vars.example .dev.vars
  # edit .dev.vars: POLYGON_API_KEY=your-polygon-key
  ```

  To use live quotes locally, also set `QUOTES_PROVIDER = "polygon"` in
  `wrangler.toml` `[vars]`.

- **Deployed Workers**: upload secrets with Wrangler:

  ```bash
  cd workers/api
  npx wrangler secret put POLYGON_API_KEY                  # default (dev) target
  npx wrangler secret put POLYGON_API_KEY --env production # production
  ```

Before the first deploy, create the D1 database and KV namespace and paste their
ids into `wrangler.toml`:

```bash
cd workers/api
npx wrangler d1 create teemtape-db            # -> database_id
npx wrangler kv namespace create QUOTES_CACHE # -> id
```

### CI / deploy secrets

Maintainers configure these GitHub Actions secrets (contributors don't need them
for local work):

- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`
- `POLYGON_API_KEY`
- `NPM_PACKAGE_TOKEN` — for publishing `@teemtape/*` packages on release.
