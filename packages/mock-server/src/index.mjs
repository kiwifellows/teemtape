#!/usr/bin/env node
// Dependency-free in-memory mock of the teemtape Worker API.
// Lets the CLI (and later the web app) be tested end-to-end without Cloudflare.
// Run: `npm run mock` (defaults to http://localhost:8787).

import { createMockServer, DELAY_SECONDS } from "./server.mjs";
import { SEED_TOKEN } from "./data.mjs";

const PORT = Number(process.env.PORT ?? 8787);

const server = createMockServer();
server.listen(PORT, () => {
  process.stdout.write(`teemtape mock API listening on http://localhost:${PORT}\n`);
  process.stdout.write(`delayed quotes by ~${DELAY_SECONDS}s · seeded watchlist token: ${SEED_TOKEN}\n`);
});
