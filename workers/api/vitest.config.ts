import path from "node:path";
import { fileURLToPath } from "node:url";
import { cloudflarePool, cloudflareTest, readD1Migrations } from "@cloudflare/vitest-pool-workers";
import { defineConfig } from "vitest/config";
import { authzStub } from "./test/authz-stub.js";

const dir = path.dirname(fileURLToPath(import.meta.url));
const TEST_RATE_LIMIT = 300;

export default defineConfig(async () => {
  // Read migrations once and apply them to the test D1 in a setup file.
  const migrations = await readD1Migrations(path.join(dir, "migrations"));

  const options = {
    singleWorker: true,
    wrangler: { configPath: "./wrangler.toml" },
    miniflare: {
      bindings: {
        TEST_MIGRATIONS: migrations,
        TEST_RATE_LIMIT,
        QUOTES_PROVIDER: "sample",
        // The catalog is normally held in memory for an hour; re-read KV on
        // every request so each test sees exactly what it seeded.
        SYMBOLS_CATALOG_REFRESH_SECONDS: "0",
        DASHBOARD_URL: "https://app.test",
        CORS_ORIGINS: "https://web.test",
      },
      // Stand-in for the private authorisation service (see test/authz-stub.ts).
      serviceBindings: { AUTHZ: authzStub },
      // The suite runs in one Worker, so the in-memory limiter's counters
      // survive across files. Lift the production limit (60/min) high enough
      // that the ordinary tests never trip it; test/rate-limit.spec.ts uses
      // TEST_RATE_LIMIT to exercise the 429 path.
      ratelimits: { RATE_LIMITER: { simple: { limit: TEST_RATE_LIMIT, period: 60 } } },
    },
  };

  return {
    plugins: [cloudflareTest(options)],
    test: {
      setupFiles: ["./test/apply-migrations.ts"],
      pool: cloudflarePool(options),
    },
  };
});
