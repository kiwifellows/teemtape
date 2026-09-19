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

test("search: shows every market a bare code matches, and filters by exchange", async (t) => {
  const server = createMockServer();
  server.listen(0);
  await once(server, "listening");
  const env = { TEEMTAPE_API_URL: `http://localhost:${server.address().port}` };
  t.after(() => server.close());

  // AMP is two different companies — both rows come back, exact matches first.
  const { stdout } = await cli(["search", "amp"], env);
  const lines = stdout.trim().split("\n");
  assert.match(lines[0], /SYMBOL\s+EXCHANGE\s+CCY\s+COMPANY/);
  assert.match(lines[1], /^AMP\s+NYSE\s+USD\s+Ameriprise/);
  assert.match(lines[2], /^AMP\.AX\s+ASX\s+AUD\s+AMP Limited/);

  const nzx = await cli(["--json", "search", "fisher", "--exchange", "nzx"], env);
  const res = JSON.parse(nzx.stdout);
  assert.equal(res.exchange, "NZX");
  assert.deepEqual(
    res.symbols.map((s) => [s.ticker, s.exchange, s.currency]),
    [["FPH.NZ", "NZX", "NZD"]],
  );
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

// --- teemtape Pro: watchlists / use / inbox ---------------------------------

import { createServer } from "node:http";

/** A stand-in for app.teemtape.com: two saved lists and a few notes behind one token. */
function createProStub() {
  const lists = [
    { token: "a".repeat(32), name: "Energy", description: null, linkAccess: "private", role: "owner", url: "https://www.teemtape.com/w/" + "a".repeat(32), createdAt: "2026-09-01T00:00:00.000Z" },
    { token: "b".repeat(32), name: "Autos", description: "EV names", linkAccess: "public-view", role: "commenter", url: "https://www.teemtape.com/w/" + "b".repeat(32), createdAt: "2026-09-02T00:00:00.000Z" },
    { token: "c".repeat(32), name: "Autos Europe", description: null, linkAccess: "public-edit", role: "viewer", url: "https://www.teemtape.com/w/" + "c".repeat(32), createdAt: "2026-09-03T00:00:00.000Z" },
  ];
  const notes = [
    { id: "n1", token: "b".repeat(32), symbol: "TSLA", author: "research_bot", source: "cli", body: "Robotaxi metros up to 6.\nSecond line.", createdAt: "2026-09-19T03:00:00.000Z" },
    { id: "n2", token: "a".repeat(32), symbol: "XOM", author: "user8351", source: "web", body: "Refining margins", createdAt: "2026-09-19T02:00:00.000Z" },
    { id: "n3", token: "b".repeat(32), symbol: "RIVN", author: "summary_agent", source: "cli", body: "Guidance reiterated", createdAt: "2026-09-19T01:00:00.000Z" },
  ];
  const server = createServer((req, res) => {
    const send = (status, body) => { res.writeHead(status, { "content-type": "application/json" }); res.end(JSON.stringify(body)); };
    if (req.headers.authorization !== "Bearer ttp_good") return send(401, { error: "sign in to continue", reason: "sign_in_required" });
    const url = new URL(req.url, "http://x");
    if (url.pathname === "/api/watchlists") return send(200, { watchlists: lists });
    if (url.pathname === "/api/notes") {
      const limit = Number(url.searchParams.get("limit") ?? 100);
      const before = url.searchParams.get("before");
      const window = before ? notes.filter((n) => n.createdAt < before) : notes;
      return send(200, {
        notes: window.slice(0, limit),
        nextBefore: window.length > limit ? window[limit - 1].createdAt : null,
        lists: lists.map((l) => ({ token: l.token, name: l.name, role: l.role, linkAccess: l.linkAccess, canPost: l.role !== "viewer" })),
        truncatedLists: [],
        errors: [],
      });
    }
    send(404, { error: "not found" });
  });
  return server;
}

test("watchlists / use: lists the Pro account's lists and switches the active token", async (t) => {
  const pro = createProStub();
  pro.listen(0);
  await once(pro, "listening");
  t.after(() => pro.close());
  const env = {
    TEEMTAPE_DASHBOARD_URL: `http://localhost:${pro.address().port}`,
    XDG_CONFIG_HOME: mkdtempSync(join(tmpdir(), "teemtape-pro-")),
  };

  // needs a token
  await assert.rejects(() => cli(["watchlists"], env), (err) => /teemtape login/.test(err.stderr));
  // a bad token is reported as such, with the app URL
  await assert.rejects(
    () => cli(["watchlists"], { ...env, TEEMTAPE_ACCESS_TOKEN: "ttp_bad" }),
    (err) => /did not accept the saved access token/.test(err.stderr) && /teemtape login/.test(err.stderr),
  );

  const authed = { ...env, TEEMTAPE_ACCESS_TOKEN: "ttp_good" };
  const listed = JSON.parse((await cli(["--json", "watchlists"], authed)).stdout);
  assert.equal(listed.current, null);
  assert.deepEqual(listed.watchlists.map((w) => [w.name, w.role]), [["Energy", "owner"], ["Autos", "commenter"], ["Autos Europe", "viewer"]]);
  const text = (await cli(["watchlists"], authed)).stdout;
  assert.match(text, /Energy\s+owner\s+private/);
  assert.match(text, /Autos\s+commenter\s+link: view/);

  // use by name, prefix, ambiguity, token, URL
  const used = JSON.parse((await cli(["--json", "use", "energy"], authed)).stdout);
  assert.equal(used.watchlist.token, "a".repeat(32));
  assert.equal(JSON.parse((await cli(["--json", "config"], authed)).stdout).token, "aaaaaa…aa");
  assert.equal(JSON.parse((await cli(["--json", "watchlists"], authed)).stdout).current, "a".repeat(32));
  assert.match((await cli(["watchlists"], authed)).stdout, /\* Energy/);

  await assert.rejects(() => cli(["use", "auto"], authed), (err) => /matches "Autos", "Autos Europe"/.test(err.stderr));
  assert.equal(JSON.parse((await cli(["--json", "use", "autos"], authed)).stdout).watchlist.name, "Autos"); // exact beats prefix
  assert.equal(JSON.parse((await cli(["--json", "use", "autos eu"], authed)).stdout).watchlist.name, "Autos Europe");
  assert.equal(JSON.parse((await cli(["--json", "use", "https://www.teemtape.com/w/" + "c".repeat(32)], authed)).stdout).watchlist.name, "Autos Europe");
  await assert.rejects(() => cli(["use", "d".repeat(32)], authed), (err) => /no saved watchlist with token/.test(err.stderr));
  await assert.rejects(() => cli(["use", "nope"], authed), (err) => /no saved watchlist called "nope"/.test(err.stderr));
});

test("inbox: cross-list notes newest first, with list/symbol filters and paging hint", async (t) => {
  const pro = createProStub();
  pro.listen(0);
  await once(pro, "listening");
  t.after(() => pro.close());
  const env = {
    TEEMTAPE_DASHBOARD_URL: `http://localhost:${pro.address().port}`,
    TEEMTAPE_ACCESS_TOKEN: "ttp_good",
    XDG_CONFIG_HOME: mkdtempSync(join(tmpdir(), "teemtape-inbox-")),
  };

  const all = JSON.parse((await cli(["--json", "inbox"], env)).stdout);
  assert.deepEqual(all.notes.map((n) => n.symbol), ["TSLA", "XOM", "RIVN"]);

  const text = (await cli(["inbox"], env)).stdout;
  assert.match(text, /TSLA\s+research_bot agent · Autos/);
  assert.match(text, /Robotaxi metros up to 6\.…/); // first line only, ellipsis for the rest
  assert.match(text, /XOM\s+user8351 web · Energy/);

  const autos = JSON.parse((await cli(["--json", "inbox", "--list", "autos"], env)).stdout);
  assert.deepEqual(autos.notes.map((n) => n.symbol), ["TSLA", "RIVN"]);
  const rivn = JSON.parse((await cli(["--json", "inbox", "--symbol", "rivn"], env)).stdout);
  assert.deepEqual(rivn.notes.map((n) => n.id), ["n3"]);
  await assert.rejects(() => cli(["inbox", "--list", "nope"], env), (err) => /no list called "nope"/.test(err.stderr));

  const paged = (await cli(["inbox", "--limit", "2"], env)).stdout;
  assert.match(paged, /older notes: teemtape inbox --before 2026-09-19T02:00:00\.000Z/);
  const older = JSON.parse((await cli(["--json", "inbox", "--before", "2026-09-19T02:00:00.000Z"], env)).stdout);
  assert.deepEqual(older.notes.map((n) => n.id), ["n3"]);
});
