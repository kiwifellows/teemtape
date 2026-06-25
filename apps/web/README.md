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
- `/w/:token` — watchlist table, notes popup, share link
- `/w/:token.md` — Markdown export of watchlist symbols and notes
- `/ai/watchlist/:token` — compact agent-friendly JSON payload for watchlists and notes

## Environment

| Variable | Default | Purpose |
| --- | --- | --- |
| `VITE_API_URL` | `https://api.teemtape.com` | Worker API base URL |
| `VITE_WEB_URL` | `window.location.origin` | Share link host |

## Build

```bash
npm run web:build
```

Output goes to `apps/web/dist/`.

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
