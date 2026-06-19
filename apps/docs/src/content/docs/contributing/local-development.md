---
title: Local development
description: Run teemtape locally — the Worker API or the dependency-free mock, plus the CLI, web app, and docs site.
---

This guide covers running teemtape on your machine for development. For a faster
"just try it" path, see the [quick start](/start/quick-start/).

## Install

```bash
git clone https://github.com/kiwifellows/teemtape.git
cd teemtape
npm install
npm run build       # builds api-client + cli + web
npm test
```

## Choose a backend

You need a backend running for the CLI and web app to talk to. Pick one.

### Option A — Worker API (recommended)

Runs the real Cloudflare Worker locally with in-memory D1 + KV. With no
`POLYGON_API_KEY` set, it serves deterministic sample quotes.

```bash
# terminal 1
cd workers/api
npm run migrate:local
npm run dev
# API at http://127.0.0.1:8787

# terminal 2 (from repo root)
TEEMTAPE_API_URL=http://127.0.0.1:8787 node packages/cli/dist/index.js init
TEEMTAPE_API_URL=http://127.0.0.1:8787 node packages/cli/dist/index.js list
```

For live Polygon quotes locally, copy `workers/api/.dev.vars.example` to
`workers/api/.dev.vars`, set `POLYGON_API_KEY`, and set
`QUOTES_PROVIDER = "polygon"` in `wrangler.toml`. See the
[configuration reference](/reference/configuration/).

### Option B — Mock API (fastest for CLI-only work)

A dependency-free in-memory server implementing the same contract. It seeds a
watchlist with token `6f1ed002ab5595859014ebf0951522d9`.

```bash
# terminal 1
npm run mock

# terminal 2
node packages/cli/dist/index.js list --token 6f1ed002ab5595859014ebf0951522d9
```

## Run the web app

```bash
npm run web:dev        # Vite on http://localhost:5173
```

It defaults to `VITE_API_URL=http://127.0.0.1:8787`, so it talks to the Worker
from Option A. Open <http://localhost:5173>.

## Run the docs site

These docs are an Astro + Starlight app under `apps/docs`:

```bash
npm run dev --workspace docs      # Astro dev server (usually http://localhost:4321)
npm run build --workspace docs    # production build to apps/docs/dist
```

## SEC symbols sync (local)

The cron that refreshes the symbol catalog doesn't run during local dev. With the
Worker running, trigger it manually:

```bash
cd workers/api
npm run sync:local
# verify
npx wrangler d1 execute teemtape-db --local --command "SELECT COUNT(*) AS n FROM symbols"
```

## Tests

```bash
npm test                                  # all workspaces
npm run test --workspace @teemtape/api    # Worker integration tests (workerd + D1 + KV)
npm run test --workspace @teemtape/cli    # CLI config + binary tests
```

## CI and deployment

| Workflow | Trigger | What it does |
| --- | --- | --- |
| Deploy API (production) | Push to `main` | Test, apply D1 migrations, deploy the Worker |
| Deploy Web (production) | Push to `main` (web / api-client paths) | Build and deploy `apps/web` to Cloudflare Pages |
| Prepare release | Manual | Bump version, update `CHANGELOG.md`, open a release PR |
| Tag and release | Release PR merged to `main` | Tag `v<version>`, cut the release, publish to npm |

Production deployment is **main only** — feature branches are not deployed. See
[releases](/reference/releases/) for the full release flow.
