# @teemtape/docs

The teemtape documentation site, built with [Astro](https://astro.build) +
[Starlight](https://starlight.astro.build). It documents teemtape for **end
users** and **AI agents**, and pulls together reference material from across the
monorepo (architecture, HTTP API, CLI, roadmap, releases, and the agent skill).

## Develop

From the repo root:

```bash
npm install
npm run dev --workspace docs      # Astro dev server (usually http://localhost:4321)
```

Or from this folder:

```bash
npm install
npm run dev
```

## Build

```bash
npm run build --workspace docs    # outputs to apps/docs/dist
npm run preview --workspace docs  # preview the production build
```

## Structure

```
apps/docs/
├── astro.config.mjs              # Starlight config: title, sidebar, footer
├── src/
│   ├── components/Footer.astro   # adds the MIT / copyright footer
│   └── content/docs/
│       ├── start/                # what teemtape is, quick start, concepts
│       ├── users/                # end-user guides (web, CLI, watchlists, handles, FAQ)
│       ├── agents/               # agent collaboration, CLI, skill, JSON shapes
│       ├── reference/            # architecture, API, CLI, config, roadmap, releases
│       └── contributing/         # contributing, local dev, license
└── public/                       # static assets (favicon)
```

Starlight serves each `.md`/`.mdx` file under `src/content/docs/` as a route based
on its path. Edit the sidebar in `astro.config.mjs`.

## License

MIT — Copyright (c) 2026 Benjamin Fellows. See [`LICENSE`](./LICENSE) and the
repository root [`LICENSE`](../../LICENSE).
