import type { Context } from "../context.js";
import { saveConfig } from "../config.js";
import { c, printJson } from "../output.js";

/** `teemtape init` — create a new anonymous watchlist and save its token locally. */
export async function initCommand(ctx: Context): Promise<void> {
  const watchlist = await ctx.client.createWatchlist();
  const path = saveConfig({ token: watchlist.token });
  const url = `${ctx.config.webUrl.replace(/\/$/, "")}/w/${watchlist.token}`;

  if (ctx.json) {
    printJson({ token: watchlist.token, url, configPath: path });
    return;
  }
  process.stdout.write(`${c.green("✓")} Created a new anonymous watchlist\n`);
  process.stdout.write(`  ${c.dim(`token saved to ${path}`)}\n`);
  process.stdout.write(`  ${c.dim("share link:")} ${url}\n`);
}
