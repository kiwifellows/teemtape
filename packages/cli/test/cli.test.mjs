import test from "node:test";
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const run = promisify(execFile);
const here = dirname(fileURLToPath(import.meta.url));
const bin = join(here, "..", "dist", "index.js");

// Start from the ambient env but strip any teemtape settings so tests are
// deterministic regardless of the shell they run in, then isolate the config dir.
function baseEnv() {
  const env = { ...process.env };
  for (const key of Object.keys(env)) {
    if (key.startsWith("TEEMTAPE_")) delete env[key];
  }
  env.XDG_CONFIG_HOME = join(here, "__no_config__");
  env.NO_COLOR = "1";
  return env;
}

function cli(args, env = {}) {
  return run("node", [bin, ...args], { env: { ...baseEnv(), ...env } });
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

test("default api url is api.teemtape.com", async () => {
  const { stdout } = await cli(["--json", "config"]);
  assert.equal(JSON.parse(stdout).apiUrl, "https://api.teemtape.com");
});

test("network failures report an actionable hint, not a bare 'fetch failed'", async () => {
  // Port 1 is reserved and refuses connections, so fetch fails fast.
  await assert.rejects(
    () => cli(["--api-url", "http://127.0.0.1:1", "init"]),
    (err) => {
      assert.equal(err.code, 1);
      assert.match(err.stderr, /could not reach the API/i);
      assert.doesNotMatch(err.stderr, /^error: fetch failed$/im);
      return true;
    },
  );
});

test("search: requires a query or filter", async () => {
  await assert.rejects(() => cli(["search"]), (err) => {
    assert.equal(err.code, 1);
    assert.match(err.stderr, /provide a search query/i);
    return true;
  });
});
