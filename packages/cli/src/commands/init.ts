import type { Context } from "../context.js";
import { saveConfig } from "../config.js";
import { ensureHandle } from "../handle.js";
import { c, printJson } from "../output.js";

/** `teemtape init` — create a new anonymous watchlist and save its token locally. */
export async function initCommand(ctx: Context): Promise<void> {
  const watchlist = await ctx.client.createWatchlist();
  const path = saveConfig({ token: watchlist.token });
  ctx.config.token = watchlist.token;
  const url = `${ctx.config.webUrl.replace(/\/$/, "")}/w/${watchlist.token}`;
  // Give this CLI a stable anonymous identity so its notes are attributable.
  const handle = await ensureHandle(ctx);

  if (ctx.json) {
    printJson({ token: watchlist.token, handle, url, configPath: path });
    return;
  }
  process.stdout.write(`${c.green("✓")} Created a new anonymous watchlist\n`);
  process.stdout.write(`  ${c.dim(`token saved to ${path}`)}\n`);
  process.stdout.write(`  ${c.dim("handle:")} ${c.cyan(handle)} ${c.dim("(change with `teemtape handle <name>`)")}\n`);
  process.stdout.write(`  ${c.dim("share link:")} ${url}\n`);
}
