import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { ADAPTERS, dedupe, parseCsv, parseNdjson, toImportSql, toNdjson, validateRecord } from "../dist/index.js";

const SYNCED_AT = "2026-09-19T00:00:00.000Z";
const fixture = (name) => readFile(new URL(`./fixtures/${name}`, import.meta.url), "utf8");

// Every adapter must produce rows that pass the schema — the fixtures are
// trimmed copies of the real files (incl. their quirks) so this is the
// contract each source must keep satisfying.
for (const adapter of ADAPTERS.values()) {
  test(`${adapter.id}: fixture rows are valid teemtape.symbol.v1`, async () => {
    const raw = await fixture({ sec: "sec.json", asx: "asx.csv", nzx: "nzx.html", nse: "nse.csv" }[adapter.id]);
    const rows = adapter.parse(raw, SYNCED_AT);
    assert.ok(rows.length > 0);
    for (const row of rows) {
      assert.deepEqual(validateRecord(row), [], `${adapter.id} ${row.symbol}`);
      assert.equal(row.source, adapter.id);
      assert.equal(row.syncedAt, SYNCED_AT);
    }
  });
}

test("sec: maps venues to MICs, keeps the CIK, skips rows without ticker or venue", async () => {
  const rows = ADAPTERS.get("US").parse(await fixture("sec.json"), SYNCED_AT);
  assert.deepEqual(
    rows.map((r) => [r.symbol, r.exchangeCode, r.mic, r.cik]),
    [
      ["NVDA", "NASDAQ", "XNAS", 1045810],
      ["AMP", "NYSE", "XNYS", 820027],
      ["BRK-B", "NYSE", "XNYS", 1067983],
      ["OTCX", "OTC", "OTCM", 1000002],
    ],
  );
  assert.equal(rows[0].suffix, "");
  assert.equal(rows[0].currency, "USD");
});

test("asx: skips the 'as at' preamble, handles quotes and CRLF, suffixes .AX", async () => {
  const rows = ADAPTERS.get("ASX").parse(await fixture("asx.csv"), SYNCED_AT);
  assert.deepEqual(
    rows.map((r) => [r.symbol, r.base, r.name]),
    [
      ["AMP.AX", "AMP", "AMP LIMITED"],
      ["BHP.AX", "BHP", "BHP GROUP LIMITED"],
      ["OBI.AX", "OBI", "O'BRIEN, INC"],
    ],
  );
  assert.equal(rows[0].currency, "AUD");
  assert.equal(rows[0].mic, "XASX");
});

test("nse: trims padded headers, keeps only the EQ series, carries ISIN and '&' codes", async () => {
  const rows = ADAPTERS.get("NSE").parse(await fixture("nse.csv"), SYNCED_AT);
  assert.deepEqual(
    rows.map((r) => [r.symbol, r.isin]),
    [
      ["RELIANCE.NS", "INE002A01018"],
      ["M&M.NS", "INE101A01026"],
    ],
  );
});

test("nzx: reads the embedded page data, keeps NZSX shares/units, drops warrants, bonds and duplicates", async () => {
  const rows = ADAPTERS.get("NZX").parse(await fixture("nzx.html"), SYNCED_AT);
  assert.deepEqual(
    rows.map((r) => [r.symbol, r.isin, r.currency]),
    [
      ["FPH.NZ", "NZFAPE0001S2", "NZD"],
      ["AFI.NZ", "AU000000AFI5", "NZD"],
      ["SMT.NZ", "NZSMTE0001S8", "NZD"],
    ],
  );
  assert.throws(() => ADAPTERS.get("NZX").parse("<html>no data</html>", SYNCED_AT), /__NEXT_DATA__/);
});

test("csv: RFC 4180 quoting", () => {
  assert.deepEqual(parseCsv('a,"b, c","say ""hi"""\r\n1,2,3\n'), [
    ["a", "b, c", 'say "hi"'],
    ["1", "2", "3"],
  ]);
});

test("ndjson round-trips and reports invalid lines with line numbers", async () => {
  const rows = ADAPTERS.get("ASX").parse(await fixture("asx.csv"), SYNCED_AT);
  const text = toNdjson(rows);
  const ok = parseNdjson(text);
  assert.deepEqual(ok.errors, []);
  assert.deepEqual(ok.records, rows);

  const broken = parseNdjson(`${text}not json\n{"schema":"teemtape.symbol.v1","symbol":"X","base":"X","suffix":"ZZ"}\n`);
  assert.equal(broken.records.length, rows.length);
  assert.deepEqual(broken.errors[0], { line: 4, problems: ["invalid JSON"] });
  assert.equal(broken.errors[1].line, 5);
  assert.ok(broken.errors[1].problems.includes("unknown market suffix: ZZ"));
});

test("validateRecord: symbol must equal base + suffix and split back to the same market", () => {
  const good = ADAPTERS.get("ASX").parse('Company name,ASX code,GICS industry group\n"X","BHP","M"\n', SYNCED_AT)[0];
  assert.deepEqual(validateRecord(good), []);
  assert.ok(validateRecord({ ...good, symbol: "BHP" }).some((p) => p.includes("does not match")));
  assert.ok(validateRecord({ ...good, isin: "nope" }).some((p) => p.startsWith("isin invalid")));
  assert.ok(validateRecord({ ...good, currency: "AU$" }).some((p) => p.includes("ISO 4217")));
  assert.ok(validateRecord({ ...good, cik: 1.5 }).some((p) => p.startsWith("cik invalid")));
});

test("dedupe: same symbol with different ISINs is a conflict, otherwise the richer row wins", async () => {
  const [fph] = ADAPTERS.get("NZX").parse(await fixture("nzx.html"), SYNCED_AT);
  const noIsin = { ...fph, isin: null, name: "older row" };
  const other = { ...fph, isin: "NZOTHER00019" };

  const merged = dedupe([noIsin, fph]);
  assert.deepEqual(merged.report, { duplicates: 1, conflicts: [] });
  assert.equal(merged.records[0].isin, fph.isin);

  const clash = dedupe([fph, other]);
  assert.deepEqual(clash.report.conflicts, [{ symbol: "FPH.NZ", isins: [fph.isin, other.isin] }]);
  assert.equal(clash.records.length, 1);
});

test("toImportSql: batched upserts, escaped literals, cleanup scoped to imported markets", async () => {
  const asx = ADAPTERS.get("ASX").parse(await fixture("asx.csv"), SYNCED_AT);
  const nzx = ADAPTERS.get("NZX").parse(await fixture("nzx.html"), SYNCED_AT);
  const sql = toImportSql([...asx, ...nzx], { syncedAt: SYNCED_AT });

  assert.match(sql, /^-- teemtape symbols import \(teemtape\.symbol\.v1\): 6 rows, markets AX\+NZ/);
  assert.match(sql, /INSERT INTO symbols \(ticker, base, suffix, exchange_code, mic, currency, country, title, isin, cik_str, source, synced_at\) VALUES/);
  assert.match(sql, /ON CONFLICT\(ticker\) DO UPDATE SET/);
  // O'Brien's quote is doubled, ISIN-less rows are NULL, the CIK column is NULL for non-US.
  assert.match(sql, /\('OBI\.AX', 'OBI', 'AX', 'ASX', 'XASX', 'AUD', 'AU', 'O''BRIEN, INC', NULL, NULL, 'asx', '2026-09-19T00:00:00\.000Z'\)/);
  assert.match(sql, /\('FPH\.NZ', 'FPH', 'NZ', 'NZX', 'XNZE', 'NZD', 'NZ', 'Fisher & Paykel[^']*', 'NZFAPE0001S2', NULL, 'nzx'/);
  // Only the imported markets are cleaned up — US rows are untouched.
  assert.match(sql, /DELETE FROM symbols WHERE suffix IN \('AX', 'NZ'\) AND synced_at < '2026-09-19T00:00:00\.000Z';\n$/);
  assert.doesNotMatch(sql, /suffix IN \([^)]*''/);

  // One statement per 200 rows.
  const many = Array.from({ length: 450 }, (_, i) => ({ ...asx[0], symbol: `S${i}.AX`, base: `S${i}` }));
  const big = toImportSql(many, { syncedAt: SYNCED_AT });
  assert.equal((big.match(/INSERT INTO symbols/g) ?? []).length, 3);
});

test("cli: fetch --from fixture → ndjson → import → sql, and refuses cross-file ISIN conflicts", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "teemtape-symbols-"));
  const cli = new URL("../dist/cli.js", import.meta.url).pathname;
  const run = (...args) => spawnSync(process.execPath, [cli, ...args], { encoding: "utf8" });

  const fetched = run("fetch", "--market", "nzx", "--from", new URL("./fixtures/nzx.html", import.meta.url).pathname, "--out", path.join(dir, "NZX.ndjson"));
  assert.equal(fetched.status, 0, fetched.stderr);
  assert.match(fetched.stderr, /nzx: 3 symbols/);

  const imported = run("import", path.join(dir, "NZX.ndjson"), "--sql", path.join(dir, "symbols.sql"), "--synced-at", SYNCED_AT);
  assert.equal(imported.status, 0, imported.stderr);
  assert.match(imported.stderr, /3 symbols \(NZ\)/);
  const sql = await readFile(path.join(dir, "symbols.sql"), "utf8");
  assert.match(sql, /'FPH\.NZ'/);
  assert.match(sql, /suffix IN \('NZ'\)/);

  // A second file claiming FPH.NZ is a different security must stop the import.
  const { records } = parseNdjson(await readFile(path.join(dir, "NZX.ndjson"), "utf8"));
  await writeFile(path.join(dir, "other.ndjson"), toNdjson([{ ...records[0], isin: "NZOTHER00019" }]));
  const clash = run("import", path.join(dir, "NZX.ndjson"), path.join(dir, "other.ndjson"), "--sql", path.join(dir, "x.sql"));
  assert.equal(clash.status, 1);
  assert.match(clash.stderr, /conflict: FPH\.NZ has ISINs NZFAPE0001S2, NZOTHER00019/);

  const unknown = run("fetch", "--market", "MARS", "--out", path.join(dir, "m.ndjson"));
  assert.equal(unknown.status, 1);
  assert.match(unknown.stderr, /no adapter for market MARS/);
});
