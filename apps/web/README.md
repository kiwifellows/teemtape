# @teemtape/web

Desktop web app for teemtape (milestone M2). React + Vite, design tokens from
[`wireframes/`](../../wireframes/), data via [`@teemtape/api-client`](../../packages/api-client/).

## Local development

From the repo root:

```bash
npm install
npm run build          # builds api-client + cli
npm run web:dev        # Vite on http://localhost:5173
```

In another terminal, run the API (pick one):

```bash
# Worker API (recommended)
npm run api:dev

# or dependency-free mock
npm run mock
```

The dev server defaults to `VITE_API_URL=http://127.0.0.1:8787` (see `.env.development`).

## Routes

- `/` — creates a new anonymous watchlist and redirects to `/w/:token`
- `/w/:token` — watchlist table, notes popup, share link (Pages Function injects embedded JSON + API discovery)
- `/w/:token.md` — Markdown export of watchlist symbols and notes
- `/w/:token/markdown` — same Markdown export (fallback route)
- `/ai/watchlist/:token` — agent JSON: watchlist, comments, and HTTP API map for posting notes

## Environment

| Variable | Default | Purpose |
| --- | --- | --- |
| `VITE_API_URL` | `https://api.teemtape.com` | Worker API base URL (browser / React app) |
| `VITE_WEB_URL` | `window.location.origin` | Share link host |
| `API_BASE_URL` | `https://api.teemtape.com` | Worker base URL for Pages Functions (server-side fetch) |

Set `API_BASE_URL` in the Cloudflare Pages dashboard (or `.dev.vars` locally) when
the Functions should call a non-production API.

## Build

```bash
npm run web:build
```

Output goes to `apps/web/dist/`. Pages Functions live in `apps/web/functions/` (shared
code in `functions/utils/`, not routed) and are deployed alongside `dist/`.

## Local development with Functions

Vite (`npm run web:dev`) does **not** run Pages Functions. To test `/w/:token`,
`/ai/watchlist/:token`, and `/w/:token.md` locally:

```bash
npm run build --workspace @teemtape/api-client
npm run web:build
npm run web:pages:dev    # wrangler pages dev on :8788 (default)
```

In another terminal, run the API (`npm run api:dev`). Optional: create
`apps/web/.dev.vars` with `API_BASE_URL=http://127.0.0.1:8787`.

## Deploy (Cloudflare Pages)

Production deploys run automatically when changes to `apps/web/` (or
`packages/api-client/`) merge to `main` — see
[`.github/workflows/deploy-web.yml`](../../.github/workflows/deploy-web.yml).

Manual deploy from the repo root (maintainers):

```bash
npm run build --workspace @teemtape/api-client
npm run web:build
npm run web:deploy
```

Requires `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` in the environment
(same secrets as the API Worker). The Pages project name is **`teemtape-web`**.

### Custom domain

After the first deploy, attach **`www.teemtape.com`** in the Cloudflare dashboard:
Workers & Pages → **teemtape-web** → Custom domains → Set up a custom domain.

SPA routing (`/w/:token`) is handled by `public/_redirects` (copied into `dist/`).

### Production environment

Build-time variables live in `.env.production`:

| Variable | Production value |
| --- | --- |
| `VITE_API_URL` | `https://api.teemtape.com` |
| `VITE_WEB_URL` | `https://www.teemtape.com` |
