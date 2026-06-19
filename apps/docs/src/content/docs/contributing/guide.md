---
title: Contributing guide
description: How to contribute to teemtape — prerequisites, repository layout, development commands, pull requests, and conventions.
---

Thanks for your interest in teemtape — an open-source ticker app for leaving
**anonymous notes next to stock symbols**, built incrementally as a learning
project for agentic AI development.

:::caution[Not a trading app]
There is no order entry or money movement. Quotes are delayed and informational
only.
:::

## Before you start

- Read [what is teemtape?](/start/what-is-teemtape/) for status and scope.
- Skim the [architecture](/reference/architecture/) for the system design and API
  contract.
- Check the [roadmap](/reference/roadmap/) for what's planned vs. already built.
- Open an issue to discuss larger changes before a big PR.

## Prerequisites

- **Node.js 18+** (Node 24 is used in CI).
- **npm** — this is a workspaces monorepo, so install from the repo root.
- For Worker development:
  [Wrangler](https://developers.cloudflare.com/workers/wrangler/) (a dev
  dependency in `workers/api`).

No Cloudflare account is required for basic local development — the Worker runs
locally with in-memory D1/KV, and a dependency-free mock API is available too.

## Get the repo running

```bash
git clone https://github.com/kiwifellows/teemtape.git
cd teemtape
npm install
npm run build
npm test
```

See the [local development guide](/contributing/local-development/) for the two
backend options (Worker vs. mock) and how to drive them.

## Repository layout

```
teemtape/
├── apps/
│   ├── web/            # React desktop web app (@teemtape/web)
│   └── docs/           # this Astro + Starlight docs site
├── packages/
│   ├── api-client/     # Shared types + typed HTTP client (@teemtape/api-client)
│   ├── cli/            # Commander.js CLI (@teemtape/cli)
│   └── mock-server/    # In-memory API mock for local testing
├── workers/
│   └── api/            # Cloudflare Worker + D1 + KV (@teemtape/api)
├── wireframes/         # Phase 1 HTML mockups (no build step)
├── skills/             # Agent Skills (teemtape-cli)
└── docs/               # source Markdown for these docs
```

When you change the API contract, update `@teemtape/api-client` **first**, then
the Worker and CLI consumers. Keep all clients on the same contract.

## Development commands

From the repo root:

| Command | Purpose |
| --- | --- |
| `npm run build` | Build `api-client`, `cli`, and `web` |
| `npm test` | Run tests in all workspaces that define them |
| `npm run mock` | Start the in-memory mock API |
| `npm run api:dev` | Start the Worker via `wrangler dev` |
| `npm run web:dev` | Start the Vite dev server (`apps/web`) |
| `npm run web:build` | Production build of the web app |

Per-workspace examples:

```bash
npm run build --workspace @teemtape/api-client
npm run test  --workspace @teemtape/api
npm run test  --workspace @teemtape/cli
npm run dev   --workspace @teemtape/cli       # watch mode
npm run dev   --workspace docs                # this docs site
```

## Making changes

- **Worker API (`workers/api`)** — route handlers in `src/index.ts`; D1 queries in
  `src/repo.ts`/`src/symbols.ts` (parameterized); schema changes add a **new**
  file in `migrations/` (never edit old ones); add tests under `test/`.
- **Shared client (`packages/api-client`)** — types and `TeemtapeClient` are the
  contract; rebuild after type changes so dependents pick up new `.d.ts` files.
- **CLI (`packages/cli`)** — commands under `src/commands/`; config resolution in
  `src/config.ts`; never log watchlist tokens in full.
- **Wireframes (`wireframes/`)** — plain HTML/CSS/JS, no build step.

## Pull requests

1. **Branch from `main`** and keep PRs focused — one logical change per PR.
2. **Run tests** first: `npm test` (and `npm run build` if you touched
   TypeScript).
3. **Describe what and why** in the PR body; link related issues.
4. **Update docs** when behavior, config, or setup changes.
5. **No secrets** — never commit `.dev.vars`, API keys, or tokens.

Merged PR titles become changelog bullets when a release is published, so write
clear, user-facing titles (e.g. *"Add symbol search to GET /api/symbols"* rather
than *"fix stuff"*). See [releases](/reference/releases/).

## Database migrations

If your change needs a D1 schema update:

1. Add `workers/api/migrations/000N_description.sql`.
2. Test locally: `npm run migrate:local --workspace @teemtape/api`.
3. Note the migration in your PR description.

Remote production migrations are applied automatically on merge to `main`. Don't
run destructive migrations without discussion.

## Code style

- **TypeScript** across packages and the Worker; **ES modules**.
- Match existing patterns in the file you're editing.
- Prefer small, focused diffs over drive-by refactors.
- Comments only where intent isn't obvious from the code.

## Security

- Report sensitive issues **privately** to the maintainers, not in a public issue.
- Don't commit credentials, `.dev.vars`, or real watchlist tokens.
- The CLI stores tokens in `~/.config/teemtape/config.json` with mode `0600` —
  preserve that behavior.

## License

By contributing, you agree that your contributions are licensed under the **MIT
License**, Copyright (c) Benjamin Fellows. See the
[license page](/contributing/license/).
