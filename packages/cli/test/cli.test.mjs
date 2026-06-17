import test from "node:test";
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const run = promisify(execFile);
const here = dirname(fileURLToPath(import.meta.url));
const bin = join(here, "..", "dist", "index.js");

// Isolate config-file lookups to an empty dir so tests are deterministic.
const ISOLATED = { XDG_CONFIG_HOME: join(here, "__no_config__"), NO_COLOR: "1" };

function cli(args, env = {}) {
  return run("node", [bin, ...args], { env: { ...process.env, ...ISOLATED, ...env } });
}

test("config: environment variable sets the API url", async () => {
  const { stdout } = await cli(["--json", "config"], { TEEMTAPE_API_URL: "http://env.example" });
  assert.equal(JSON.parse(stdout).apiUrl, "http://env.example");
});

test("config: flag overrides environment", async () => {
  const { stdout } = await cli(["--json", "--api-url", "http://flag.example", "config"], {
    TEEMTAPE_API_URL: "http://env.example",
  });
  assert.equal(JSON.parse(stdout).apiUrl, "http://flag.example");
});

test("config: token is masked, never printed in full", async () => {
  const token = "6f1ed002ab5595859014ebf0951522d9";
  const { stdout } = await cli(["--json", "--token", token, "config"]);
  const cfg = JSON.parse(stdout);
  assert.equal(cfg.token, "6f1ed0…d9");
  assert.ok(!stdout.includes(token));
});

test("default api url is localhost:8787", async () => {
  const { stdout } = await cli(["--json", "config"]);
  assert.equal(JSON.parse(stdout).apiUrl, "http://localhost:8787");
});
