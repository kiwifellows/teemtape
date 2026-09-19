#!/usr/bin/env node
import { readFile, writeFile } from "node:fs/promises";
import { MARKETS } from "@teemtape/api-client";
import { Command } from "commander";
import { ADAPTERS } from "./adapters/index.js";
import { parseNdjson, toNdjson } from "./ndjson.js";
import { dedupe, type SymbolRecord } from "./schema.js";
import { toImportSql } from "./sql.js";

/**
 * `teemtape-symbols` — the symbols pipeline, runnable anywhere with Node:
 *
 *   teemtape-symbols fetch --market NZX --out out/NZX.ndjson
 *   teemtape-symbols import out/*.ndjson --sql out/symbols.sql
 *   wrangler d1 execute teemtape-db --remote --file out/symbols.sql
 *
 * .github/workflows/sync-symbols.yml runs exactly this fortnightly and on demand.
 */
const program = new Command()
  .name("teemtape-symbols")
  .description("Fetch exchange listings into teemtape.symbol.v1 NDJSON and render the D1 import.");

program
  .command("markets")
  .description("List markets in the registry and whether a fetch adapter exists")
  .option("--json", "machine output")
  .action((opts: { json?: boolean }) => {
    const rows = MARKETS.map((m) => {
      const adapter = ADAPTERS.get(m.code);
      return {
        code: m.code,
        suffix: m.suffix,
        mic: m.mic,
        currency: m.currency,
        name: m.name,
        adapter: adapter?.id ?? null,
        source: adapter?.sourceUrl ?? null,
      };
    });
    if (opts.json) {
      process.stdout.write(`${JSON.stringify(rows, null, 2)}\n`);
      return;
    }
    for (const r of rows) {
      const suffix = r.suffix ? `.${r.suffix}` : "(bare)";
      const status = r.adapter ? `adapter: ${r.adapter} ← ${r.source}` : "no adapter yet";
      process.stdout.write(`${r.code.padEnd(6)} ${suffix.padEnd(7)} ${r.currency}  ${status}\n`);
    }
  });

program
  .command("fetch")
  .description("Download one market's official listing and write normalised NDJSON")
  .requiredOption("--market <code>", "market code, e.g. US, NZX, ASX, NSE")
  .requiredOption("--out <file>", "NDJSON output path")
  .option("--from <file>", "parse a previously downloaded raw file instead of fetching (offline / tests)")
  .action(async (opts: { market: string; out: string; from?: string }) => {
    const adapter = ADAPTERS.get(opts.market.toUpperCase());
    if (!adapter) {
      throw new Error(`no adapter for market ${opts.market}; known: ${[...ADAPTERS.keys()].join(", ")}`);
    }
    const syncedAt = new Date().toISOString();
    const raw = opts.from ? await readFile(opts.from, "utf8") : await adapter.fetch();
    const { records, report } = dedupe(adapter.parse(raw, syncedAt));
    failOnConflicts(report.conflicts, `within ${adapter.id}`);
    await writeFile(opts.out, toNdjson(records), "utf8");
    const dupes = report.duplicates ? ` (${report.duplicates} duplicates dropped)` : "";
    process.stderr.write(`${adapter.id}: ${records.length} symbols → ${opts.out}${dupes}\n`);
  });

program
  .command("import")
  .description("Validate NDJSON files and render idempotent SQL for `wrangler d1 execute --file`")
  .argument("<files...>", "NDJSON inputs")
  .requiredOption("--sql <file>", "SQL output path")
  .option("--synced-at <iso>", "batch marker (default: now); older rows in the imported markets are deleted")
  .action(async (files: string[], opts: { sql: string; syncedAt?: string }) => {
    const all: SymbolRecord[] = [];
    let bad = 0;
    for (const file of files) {
      const { records, errors } = parseNdjson(await readFile(file, "utf8"));
      for (const e of errors) process.stderr.write(`${file}:${e.line}: ${e.problems.join("; ")}\n`);
      bad += errors.length;
      all.push(...records);
    }
    if (bad) throw new Error(`${bad} invalid line(s); fix the NDJSON before importing`);
    const { records, report } = dedupe(all);
    failOnConflicts(report.conflicts, "across files");
    const syncedAt = opts.syncedAt ?? new Date().toISOString();
    // Stamp every row with the batch marker so the stale-row cleanup is exact.
    const stamped = records.map((r) => ({ ...r, syncedAt }));
    await writeFile(opts.sql, toImportSql(stamped, { syncedAt }), "utf8");
    const markets = [...new Set(stamped.map((r) => r.suffix || "US"))].join(", ");
    process.stderr.write(`${stamped.length} symbols (${markets}) → ${opts.sql}\n`);
  });

function failOnConflicts(conflicts: Array<{ symbol: string; isins: string[] }>, where: string): void {
  if (!conflicts.length) return;
  for (const c of conflicts) process.stderr.write(`conflict: ${c.symbol} has ISINs ${c.isins.join(", ")}\n`);
  throw new Error(`${conflicts.length} symbol collision(s) ${where}; refusing to continue`);
}

program.parseAsync(process.argv).catch((err: unknown) => {
  process.stderr.write(`error: ${err instanceof Error ? err.message : String(err)}\n`);
  process.exitCode = 1;
});
