import type { Context } from "../context.js";
import { c, printJson } from "../output.js";

/** `teemtape share` — print the anonymous shareable watchlist link. */
export async function shareCommand(ctx: Context): Promise<void> {
  const token = ctx.config.token;
  if (!token) {
    throw new Error("No watchlist token set. Run `teemtape init` to create one, or pass --token.");
  }
  const url = `${ctx.config.webUrl.replace(/\/$/, "")}/w/${token}`;
  if (ctx.json) {
    printJson({ url, token });
    return;
  }
  process.stdout.write(`${c.dim("# your anonymous watchlist link (share with anyone):")}\n`);
  process.stdout.write(`${url}\n`);
}
