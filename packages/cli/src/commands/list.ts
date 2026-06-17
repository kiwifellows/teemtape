import type { Context } from "../context.js";
import { printJson, printQuotesTable } from "../output.js";

export interface ListOptions {
  symbols?: string;
}

/** `teemtape list` — show delayed quotes for the watchlist (or --symbols). */
export async function listCommand(ctx: Context, opts: ListOptions): Promise<void> {
  let symbols: string[];
  if (opts.symbols) {
    symbols = splitSymbols(opts.symbols);
  } else {
    const watchlist = await ctx.client.getWatchlist();
    symbols = watchlist.symbols;
  }

  if (symbols.length === 0) {
    if (ctx.json) {
      printJson({ quotes: [], delayedSeconds: 0, source: "none" });
      return;
    }
    process.stdout.write("No symbols to show. Add one with `teemtape add <SYMBOL>`.\n");
    return;
  }

  const res = await ctx.client.getQuotes(symbols);
  if (ctx.json) {
    printJson(res);
    return;
  }
  printQuotesTable(res.quotes, res.delayedSeconds, res.source);
}

function splitSymbols(raw: string): string[] {
  return raw
    .split(",")
    .map((s) => s.trim().toUpperCase())
    .filter(Boolean);
}
