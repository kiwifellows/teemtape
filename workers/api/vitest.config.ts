import path from "node:path";
import { fileURLToPath } from "node:url";
import { cloudflarePool, cloudflareTest, readD1Migrations } from "@cloudflare/vitest-pool-workers";
import { defineConfig } from "vitest/config";

const dir = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig(async () => {
  // Read migrations once and apply them to the test D1 in a setup file.
  const migrations = await readD1Migrations(path.join(dir, "migrations"));

  const options = {
    singleWorker: true,
    wrangler: { configPath: "./wrangler.toml" },
    miniflare: {
      bindings: {
        TEST_MIGRATIONS: migrations,
        QUOTES_PROVIDER: "sample",
      },
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
