import type { Context } from "../context.js";
import { printJson, printNotes } from "../output.js";

/** `teemtape notes <SYMBOL>` — read the note thread for a symbol. */
export async function notesCommand(ctx: Context, symbol: string): Promise<void> {
  const res = await ctx.client.getNotes(symbol);
  if (ctx.json) {
    printJson(res);
    return;
  }
  printNotes(res.symbol, res.notes);
}
