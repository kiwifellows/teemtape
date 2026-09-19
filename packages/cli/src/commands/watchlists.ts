import type { Context } from "../context.js";
import { saveConfig } from "../config.js";
import { c, printJson } from "../output.js";
import { ProClient, type ProWatchlist } from "../pro.js";

const ACCESS_LABEL: Record<ProWatchlist["linkAccess"], string> = {
  "public-edit": "link: edit",
  "public-comment": "link: comment",
  "public-view": "link: view",
  private: "private",
};

/** `teemtape watchlists` — the saved lists behind the access token, marking the one in use. */
export async function watchlistsCommand(ctx: Context): Promise<void> {
  const lists = await new ProClient(ctx.config).watchlists();
  const current = ctx.config.token;

  if (ctx.json) {
    printJson({ current: current ?? null, watchlists: lists });
    return;
  }
  if (lists.length === 0) {
    process.stdout.write(
      `No saved watchlists yet. Create or claim one at ${c.cyan(`${ctx.config.dashboardUrl}/watchlists`)}.\n`,
    );
    return;
  }
  const nameWidth = Math.max(4, ...lists.map((l) => l.name.length));
  process.stdout.write(`${c.dim("  " + "NAME".padEnd(nameWidth) + "  ROLE       ACCESS         TOKEN")}\n`);
  for (const l of lists) {
    const mark = l.token === current ? c.green("*") : " ";
    process.stdout.write(
      `${mark} ${c.bold(l.name.padEnd(nameWidth))}  ${l.role.padEnd(9)}  ${ACCESS_LABEL[l.linkAccess].padEnd(13)}  ${c.dim(l.token)}\n`,
    );
  }
  process.stdout.write(`\n${c.dim("* = in use. Switch with `teemtape use <name|token>`.")}\n`);
}

/**
 * `teemtape use <name|token|url>` — make one of your saved lists the default
 * for `list`, `add`, `notes`, `note`. Names match case-insensitively, whole or
 * as a unique prefix; a 32-hex token or a share URL is taken as-is.
 */
export async function useCommand(ctx: Context, target: string): Promise<void> {
  const wanted = target.trim();
  if (!wanted) throw new Error("say which list: `teemtape use <name|token>`");
  const lists = await new ProClient(ctx.config).watchlists();

  const byToken = wanted.match(/([0-9a-f]{32})(?:[/?#]|$)/i)?.[1]?.toLowerCase();
  let chosen: ProWatchlist | undefined;
  if (byToken) {
    chosen = lists.find((l) => l.token === byToken);
    if (!chosen) throw new Error(`no saved watchlist with token ${byToken}. \`teemtape watchlists\` shows what you have.`);
  } else {
    const lower = wanted.toLowerCase();
    const exact = lists.filter((l) => l.name.toLowerCase() === lower);
    const prefix = exact.length ? exact : lists.filter((l) => l.name.toLowerCase().startsWith(lower));
    if (prefix.length === 0) {
      throw new Error(`no saved watchlist called "${wanted}". \`teemtape watchlists\` shows what you have.`);
    }
    if (prefix.length > 1) {
      throw new Error(`"${wanted}" matches ${prefix.map((l) => `"${l.name}"`).join(", ")} — be more specific, or use the token.`);
    }
    chosen = prefix[0];
  }

  const path = saveConfig({ token: chosen!.token });
  ctx.config.token = chosen!.token;
  if (ctx.json) {
    printJson({ watchlist: chosen, configPath: path });
    return;
  }
  process.stdout.write(`${c.green("✓")} Using ${c.bold(chosen!.name)} ${c.dim(`(${chosen!.role}, ${chosen!.token})`)}\n`);
  process.stdout.write(`  ${c.dim(`saved to ${path}`)}\n`);
}
