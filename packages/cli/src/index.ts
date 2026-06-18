#!/usr/bin/env node
import { ApiError } from "@teemtape/api-client";
import { Command } from "commander";
import { addCommand } from "./commands/add.js";
import { configCommand } from "./commands/config.js";
import { initCommand } from "./commands/init.js";
import { listCommand } from "./commands/list.js";
import { noteCommand } from "./commands/note.js";
import { notesCommand } from "./commands/notes.js";
import { searchCommand } from "./commands/search.js";
import { shareCommand } from "./commands/share.js";
import { createContext, type Context, type GlobalFlags } from "./context.js";
import { c } from "./output.js";

const program = new Command();

program
  .name("teemtape")
  .description("teemtape — list stocks and post anonymous notes from the terminal.")
  .version("0.0.0")
  .option("--api-url <url>", "Worker API base URL (env: TEEMTAPE_API_URL)")
  .option("--token <token>", "watchlist token (env: TEEMTAPE_TOKEN)")
  .option("--web-url <url>", "web app base URL used for share links (env: TEEMTAPE_WEB_URL)")
  .option("--json", "output machine-readable JSON (handy for agents)")
  .showHelpAfterError();

function globalsOf(command: Command): GlobalFlags {
  const o = command.optsWithGlobals();
  return {
    apiUrl: o.apiUrl as string | undefined,
    token: o.token as string | undefined,
    webUrl: o.webUrl as string | undefined,
    json: Boolean(o.json),
  };
}

async function run(command: Command, fn: (ctx: Context) => Promise<void>): Promise<void> {
  try {
    const ctx = createContext(globalsOf(command));
    await fn(ctx);
  } catch (err) {
    handleError(err);
  }
}

function fail(message: string): void {
  process.stderr.write(`${c.red("error:")} ${message}\n`);
  process.exitCode = 1;
}

function handleError(err: unknown): void {
  if (err instanceof ApiError) {
    fail(`${err.message} (HTTP ${err.status})`);
    return;
  }
  const cause = err instanceof Error ? (err.cause as { code?: string } | undefined) : undefined;
  if (cause?.code === "ECONNREFUSED" || cause?.code === "ENOTFOUND") {
    fail("could not reach the API. Is it running? For local testing run `npm run mock` in another terminal.");
    return;
  }
  fail(err instanceof Error ? err.message : String(err));
}

program
  .command("init")
  .description("create a new anonymous watchlist and save its token locally")
  .action(async (_opts, command: Command) => run(command, (ctx) => initCommand(ctx)));

program
  .command("list")
  .description("show delayed quotes for your watchlist (or --symbols)")
  .option("-s, --symbols <list>", "comma-separated symbols to show instead of the watchlist")
  .action(async (opts: { symbols?: string }, command: Command) =>
    run(command, (ctx) => listCommand(ctx, opts)),
  );

program
  .command("search")
  .argument("[query]", "search ticker or company name (substring match)")
  .description("search the SEC symbol catalog by ticker or company name")
  .option("--symbol <text>", "filter by ticker substring only")
  .option("--name <text>", "filter by company name substring only")
  .option("--limit <n>", "max results to return (default 20, max 100)")
  .option("--offset <n>", "skip first n matches (for paging)")
  .option("--sort <field>", "sort by ticker or title", "ticker")
  .action(async (query: string | undefined, opts: SearchCliOptions, command: Command) =>
    run(command, (ctx) => searchCommand(ctx, query, opts)),
  );

program
  .command("add")
  .argument("<symbol>", "ticker symbol, e.g. AAPL")
  .description("add a symbol to your watchlist")
  .action(async (symbol: string, _opts, command: Command) =>
    run(command, (ctx) => addCommand(ctx, symbol)),
  );

program
  .command("notes")
  .argument("<symbol>", "ticker symbol, e.g. AAPL")
  .description("read the anonymous note thread for a symbol")
  .action(async (symbol: string, _opts, command: Command) =>
    run(command, (ctx) => notesCommand(ctx, symbol)),
  );

program
  .command("note")
  .argument("<symbol>", "ticker symbol, e.g. AAPL")
  .requiredOption("-m, --message <text>", "the note to post")
  .description("post an anonymous note to a symbol (tagged as source: cli)")
  .action(async (symbol: string, opts: { message?: string }, command: Command) =>
    run(command, (ctx) => noteCommand(ctx, symbol, opts)),
  );

program
  .command("share")
  .description("print your anonymous shareable watchlist link")
  .action(async (_opts, command: Command) => run(command, (ctx) => shareCommand(ctx)));

program
  .command("config")
  .description("show the resolved configuration (token masked)")
  .action(async (_opts, command: Command) => run(command, (ctx) => configCommand(ctx)));

interface SearchCliOptions {
  symbol?: string;
  name?: string;
  limit?: string;
  offset?: string;
  sort?: "ticker" | "title";
}

program.addHelpText(
  "after",
  `
Examples:
  $ teemtape --api-url http://localhost:8787 init
  $ teemtape search nvidia
  $ teemtape search --symbol nv
  $ teemtape search --name microsoft
  $ teemtape add NVDA
  $ teemtape list
  $ teemtape notes NVDA
  $ teemtape note AAPL --message "Earnings call scheduled."
  $ teemtape share
  $ teemtape list --json        # machine-readable output for agents

Config precedence: CLI flags > env vars > ~/.config/teemtape/config.json > defaults
`,
);

program.parseAsync().catch(handleError);
