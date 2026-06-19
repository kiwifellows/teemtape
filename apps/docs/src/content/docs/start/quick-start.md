---
title: Quick start
description: Run teemtape locally in two terminals — the Cloudflare Worker API and the CLI — with no API key.
---

This guide gets teemtape running on your machine in a couple of minutes. It uses
**sample quotes**, so you need no API key and no Cloudflare account.

## Prerequisites

- **Node.js 18 or newer** (Node 24 is used in CI).
- **npm** — this is an npm-workspaces monorepo, so install from the repo root.

## 1. Clone and build

```bash
git clone https://github.com/kiwifellows/teemtape.git
cd teemtape
npm install
npm run build
```

`npm run build` builds the shared API client, the CLI, and the web app.

## 2. Start the backend

You have two options for the backend. Pick whichever you prefer.

### Option A — the real Worker API (recommended)

Runs the actual Cloudflare Worker locally via Wrangler, with in-memory D1 + KV.
With no `POLYGON_API_KEY` set it serves deterministic **sample** quotes.

```bash
cd workers/api
npm run migrate:local   # apply the D1 schema to the local database
npm run dev             # wrangler dev on http://127.0.0.1:8787
```

### Option B — the dependency-free mock

No Cloudflare toolchain required. The mock implements the same contract and
seeds a watchlist with token `6f1ed002ab5595859014ebf0951522d9`.

```bash
npm run mock            # http://localhost:8787
```

## 3. Drive it with the CLI

In a second terminal, point the CLI at your backend and try it out.

```bash
# Worker API (Option A)
TEEMTAPE_API_URL=http://127.0.0.1:8787 node packages/cli/dist/index.js init
TEEMTAPE_API_URL=http://127.0.0.1:8787 node packages/cli/dist/index.js add NVDA
TEEMTAPE_API_URL=http://127.0.0.1:8787 node packages/cli/dist/index.js list
TEEMTAPE_API_URL=http://127.0.0.1:8787 node packages/cli/dist/index.js note NVDA -m "First note from the CLI."
```

If you chose the mock (Option B), pass the seeded token instead of running
`init`:

```bash
TEEMTAPE_API_URL=http://localhost:8787 \
  node packages/cli/dist/index.js list --token 6f1ed002ab5595859014ebf0951522d9
```

## 4. (Optional) Run the web app

In a third terminal, start the web app and open it in your browser:

```bash
npm run web:dev          # Vite on http://localhost:5173
```

The dev server defaults to `VITE_API_URL=http://127.0.0.1:8787`, so it talks to
the Worker API from Option A. Open <http://localhost:5173>, and you'll get a new
watchlist automatically.

## 5. (Optional) Run the docs site

These docs are themselves an Astro + Starlight site under `apps/docs`:

```bash
npm run dev --workspace docs    # Astro dev server (usually http://localhost:4321)
```

## Where to next

- Learn the vocabulary in [key concepts](/start/concepts/).
- Read the full [CLI guide](/users/cli/) or the [command reference](/reference/cli-commands/).
- Wiring up an agent? See [agent collaboration](/agents/overview/).
