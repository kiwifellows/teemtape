import type { Context } from "../context.js";
import { c, printJson } from "../output.js";

export interface NoteOptions {
  message?: string;
}

/** `teemtape note <SYMBOL> --message "…"` — post an anonymous note (source: cli). */
export async function noteCommand(ctx: Context, symbol: string, opts: NoteOptions): Promise<void> {
  const body = opts.message?.trim();
  if (!body) {
    throw new Error("A note message is required. Use --message \"your note\".");
  }

  const note = await ctx.client.addNote({ symbol, body, source: "cli" });
  if (ctx.json) {
    printJson(note);
    return;
  }
  process.stdout.write(`${c.green("✓")} Note posted to ${c.bold(note.symbol)} as ${c.cyan(note.author)}\n`);
  process.stdout.write(`  ${c.dim(`id: ${note.id} · visible in web & mobile note popups`)}\n`);
}
