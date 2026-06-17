import { applyD1Migrations, env } from "cloudflare:test";

// Apply the D1 schema migrations to the isolated test database before tests run.
await applyD1Migrations(env.DB, env.TEST_MIGRATIONS);
