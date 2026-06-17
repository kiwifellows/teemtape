import type { Context } from "../context.js";
import { c, printJson } from "../output.js";

/** `teemtape add <SYMBOL>` — add a symbol to the watchlist. */
export async function addCommand(ctx: Context, symbol: string): Promise<void> {
  const watchlist = await ctx.client.addSymbol(symbol);
  if (ctx.json) {
    printJson(watchlist);
    return;
  }
  process.stdout.write(`${c.green("✓")} Added ${c.bold(symbol.toUpperCase())}\n`);
  process.stdout.write(`  ${c.dim(`watchlist: ${watchlist.symbols.join(", ") || "(empty)"}`)}\n`);
}
