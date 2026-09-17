import test from "node:test";
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { once } from "node:events";
import { createMockServer } from "../../mock-server/src/server.mjs";

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

test("config: handle defaults to (none) and reflects the --handle flag", async () => {
  const off = await cli(["--json", "config"]);
  assert.equal(JSON.parse(off.stdout).handle, "(none)");

  const on = await cli(["--json", "--handle", "user1234", "config"]);
  assert.equal(JSON.parse(on.stdout).handle, "user1234");
});

test("handle: reports no handle set when none is configured", async () => {
  const { stdout } = await cli(["--json", "handle"]);
  assert.equal(JSON.parse(stdout).handle, null);
});

test("handle: claims a handle and persists it to config", async (t) => {
  const server = createMockServer();
  server.listen(0);
  await once(server, "listening");
  const { port } = server.address();
  t.after(() => server.close());

  // Isolated config dir so the saved handle persists between invocations.
  const configHome = mkdtempSync(join(tmpdir(), "teemtape-cli-"));
  const env = {
    TEEMTAPE_API_URL: `http://127.0.0.1:${port}`,
    XDG_CONFIG_HOME: configHome,
  };

  const claimed = await cli(["--json", "handle", "Trader_Jane"], env);
  assert.equal(JSON.parse(claimed.stdout).handle, "trader_jane");

  // a later invocation reads the handle from the saved config
  const shown = await cli(["--json", "handle"], env);
  assert.equal(JSON.parse(shown.stdout).handle, "trader_jane");
});

test("search: requires a query or filter", async () => {
  await assert.rejects(() => cli(["search"]), (err) => {
    assert.equal(err.code, 1);
    assert.match(err.stderr, /provide a search query/i);
    return true;
  });
});

test("login: verifies and saves an access token; private lists then work; logout forgets it", async (t) => {
  const seeded = "6f1ed002ab5595859014ebf0951522d9";
  const server = createMockServer({
    authz: { privateTokens: seeded, accessToken: "pat-good", signInUrl: "https://app.test" },
  });
  server.listen(0);
  await once(server, "listening");
  const apiUrl = `http://localhost:${server.address().port}`;
  t.after(() => server.close());
  const env = { TEEMTAPE_API_URL: apiUrl, XDG_CONFIG_HOME: mkdtempSync(join(tmpdir(), "teemtape-login-")) };

  // anonymous → denied with a sign-in hint
  await assert.rejects(
    () => cli(["--token", seeded, "list"], env),
    (err) => {
      assert.match(err.stderr, /HTTP 401/);
      assert.match(err.stderr, /teemtape login/);
      assert.match(err.stderr, /https:\/\/app\.test/);
      return true;
    },
  );

  // a bad token is rejected before it is saved
  await assert.rejects(() => cli(["login", "pat-bad"], env), (err) => /did not recognise/.test(err.stderr));
  assert.equal(JSON.parse((await cli(["--json", "config"], env)).stdout).accessToken, "(none)");

  // a good token is verified, saved masked, and unlocks the list
  const { stdout } = await cli(["--json", "login", "pat-good"], env);
  assert.equal(JSON.parse(stdout).handle, "mockuser");
  const cfg = JSON.parse((await cli(["--json", "config"], env)).stdout);
  assert.equal(cfg.accessToken, "****");
  assert.ok(!JSON.stringify(cfg).includes("pat-good"));
  const listed = await cli(["--json", "--token", seeded, "list"], env);
  assert.ok(JSON.parse(listed.stdout).quotes.length > 0);

  // wrong token in env → 403 with a role hint
  await assert.rejects(
    () => cli(["--token", seeded, "list"], { ...env, TEEMTAPE_ACCESS_TOKEN: "pat-other" }),
    (err) => /HTTP 403/.test(err.stderr) && /does not allow/.test(err.stderr),
  );

  // logout
  await cli(["logout"], env);
  assert.equal(JSON.parse((await cli(["--json", "config"], env)).stdout).accessToken, "(none)");
});
