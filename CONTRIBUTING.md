# Contributing to teemtape

Thanks for your interest in teemtape. This is an open-source ticker app for
leaving **anonymous notes next to stock symbols** — built incrementally as a
learning project for agentic AI development.

> **Not a trading app.** There is no order entry or money movement. Quotes are
> delayed and informational only.

## Before you start

- Read the [README](README.md) for project status and layout.
- Skim [`docs/architecture.md`](docs/architecture.md) for the system design and API contract.
- Check [`docs/roadmap.md`](docs/roadmap.md) for what is planned vs. already built.
- Open an issue to discuss larger changes before spending time on a big PR.

## Prerequisites

- **Node.js** 18 or newer (Node 24 is used in CI)
- **npm** (workspaces monorepo — install from the repo root)
- For Worker development: [Wrangler](https://developers.cloudflare.com/workers/wrangler/) (installed as a dev dependency in `workers/api`)

No Cloudflare account is required for basic local development — the Worker runs
locally via `wrangler dev` with in-memory D1/KV, and a dependency-free mock API
is available if you prefer not to use Wrangler at all.

## Get the repo running

```bash
git clone https://github.com/kiwifellows/teemtape.git
cd teemtape
npm install
npm run build
npm test
```

### Option A — Worker API (recommended for backend/CLI work)

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

Sample quotes work with no API key. For live Polygon quotes locally, copy
`workers/api/.dev.vars.example` to `workers/api/.dev.vars` and set
`POLYGON_API_KEY`.

See [`workers/api/README.md`](workers/api/README.md) for migrations, SEC symbol
sync, and deployment details.

### Option B — Mock API (fastest path for CLI-only changes)

```bash
# terminal 1
npm run mock

# terminal 2
node packages/cli/dist/index.js list --token 6f1ed002ab5595859014ebf0951522d9
```

See [`packages/cli/README.md`](packages/cli/README.md) for CLI commands and config.

## Repository layout

```
teemtape/
├── apps/
│   └── web/            # React desktop web app (@teemtape/web)
├── packages/
│   ├── api-client/     # Shared types + typed HTTP client (@teemtape/api-client)
│   ├── cli/            # Commander.js CLI (@teemtape/cli)
│   └── mock-server/    # In-memory API mock for local testing
├── workers/
│   └── api/            # Cloudflare Worker + D1 + KV (@teemtape/api)
├── wireframes/         # Phase 1 HTML mockups (no build step)
└── docs/               # Architecture, roadmap, releases
```

When you change the API contract, update `@teemtape/api-client` first, then the
Worker and CLI consumers. Keep all clients on the same contract.

## Development commands

From the repo root:

| Command | Purpose |
| ------- | ------- |
| `npm run build` | Build `api-client`, `cli`, and `web` |
| `npm test` | Run tests in all workspaces that define them |
| `npm run mock` | Start the in-memory mock API |
| `npm run api:dev` | Start the Worker via `wrangler dev` |
| `npm run web:dev` | Start the Vite dev server (`apps/web`) |
| `npm run web:build` | Production build of the web app |
| `npm run web:deploy` | Deploy web app to Cloudflare Pages (maintainers) |

Per-workspace examples:

```bash
npm run build --workspace @teemtape/api-client
npm run test  --workspace @teemtape/api
npm run test  --workspace @teemtape/cli
npm run dev   --workspace @teemtape/cli    # watch mode
npm run typecheck --workspace @teemtape/api
```

## Making changes

### Worker API (`workers/api`)

- Route handlers live in `src/index.ts`; keep business logic in focused modules.
- D1 queries belong in `src/repo.ts` and `src/symbols.ts` — use parameterized queries.
- Schema changes require a new file in `migrations/` (never edit old migrations).
- Add or extend tests in `workers/api/test/` (Vitest + Workers runtime pool).

### Shared client (`packages/api-client`)

- Types and the `TeemtapeClient` class are the contract all surfaces share.
- Run `npm run build --workspace @teemtape/api-client` after type changes so
  dependents pick up updated `.d.ts` files.

### CLI (`packages/cli`)

- Commands live under `packages/cli/src/commands/`.
- Config resolution is in `packages/cli/src/config.ts` (flags → env → file → defaults).
- Never log watchlist tokens in full — use the existing masking helpers.

### Wireframes (`wireframes/`)

Plain HTML/CSS/JS with no build step. Open `wireframes/index.html` or serve the
folder locally. Changes here should stay aligned with the desktop/mobile designs
in the roadmap.

## Pull requests

1. **Branch from `main`** and keep PRs focused — one logical change per PR when possible.
2. **Run tests** before opening: `npm test` (and `npm run build` if you touched TypeScript).
3. **Describe what and why** in the PR body. Link related issues.
4. **Update docs** when behavior, config, or setup steps change.
5. **No secrets** in commits — never commit `.dev.vars`, API keys, or tokens.

We review PRs as time allows. Smaller, well-described PRs are easier to merge.

### PR titles and releases

Merged PR titles become changelog bullets when a GitHub release is published on
`main` (see [`docs/releases.md`](docs/releases.md)). Write clear, user-facing PR
titles — e.g. *"Add symbol search to GET /api/symbols"* rather than *"fix stuff"*.

## Database migrations

If your change needs a D1 schema update:

1. Add `workers/api/migrations/000N_description.sql`.
2. Test locally: `npm run migrate:local --workspace @teemtape/api`
3. Note the migration in your PR description.

Migrations to the remote production database are applied automatically when changes
merge to `main` (see CI below). Do not run destructive migrations without discussion.

## CI and deployment

| Workflow | Trigger | What it does |
| -------- | ------- | ------------ |
| [Deploy API (production)](.github/workflows/deploy-api.yml) | Push to `main` | Test, apply D1 migrations, deploy Worker to Cloudflare production |
| [Deploy Web (production)](.github/workflows/deploy-web.yml) | Push to `main` (web or api-client paths) | Build and deploy `apps/web` to Cloudflare Pages |
| [Update changelog](.github/workflows/changelog.yml) | GitHub release published | Prepends merged PRs to `CHANGELOG.md` |

Production deployment is **main only**. Feature branches are not deployed.

Maintainers configure these GitHub Actions secrets (contributors do not need them
for local work):

- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`
- `POLYGON_API_KEY`

## Code style

- **TypeScript** across packages and the Worker.
- **ES modules** (`"type": "module"`).
- Match existing patterns in the file you are editing — naming, imports, error handling.
- Prefer small, focused diffs over drive-by refactors.
- Comments only where intent is not obvious from the code.

There is no enforced formatter yet; keep diffs readable and consistent with surrounding code.

## Security

- Report sensitive issues privately to the maintainers rather than in a public issue.
- Do not commit credentials, `.dev.vars`, or real watchlist tokens.
- The CLI stores tokens in `~/.config/teemtape/config.json` with mode `0600` — preserve that behavior.

## License

By contributing, you agree that your contributions will be licensed under the
MIT License (see `package.json` in each package).
