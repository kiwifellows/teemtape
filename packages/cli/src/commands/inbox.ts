import type { Context } from "../context.js";
import { c, printJson } from "../output.js";
import { ProClient, type ProNote } from "../pro.js";

export interface InboxOptions {
  limit?: string;
  list?: string;
  symbol?: string;
  before?: string;
}

/**
 * `teemtape inbox` — every note on every list the access token can see,
 * newest first. The agent-side view of what people (and other agents) said.
 */
export async function inboxCommand(ctx: Context, opts: InboxOptions): Promise<void> {
  const limit = Math.min(200, Math.max(1, Number(opts.limit ?? 50) || 50));
  const page = await new ProClient(ctx.config).notes({ limit, before: opts.before });
  const names = new Map(page.lists.map((l) => [l.token, l.name]));

  let notes = page.notes;
  if (opts.list) {
    const want = opts.list.toLowerCase();
    const match = page.lists.filter((l) => l.token === want || l.name.toLowerCase() === want || l.name.toLowerCase().startsWith(want));
    if (match.length === 0) throw new Error(`no list called "${opts.list}" — \`teemtape watchlists\` shows what you have.`);
    const tokens = new Set(match.map((l) => l.token));
    notes = notes.filter((n) => tokens.has(n.token));
  }
  if (opts.symbol) {
    const sym = opts.symbol.trim().toUpperCase();
    notes = notes.filter((n) => n.symbol === sym);
  }

  if (ctx.json) {
    printJson({ ...page, notes });
    return;
  }

  if (page.errors.length) {
    process.stderr.write(`${c.yellow("!")} couldn't read: ${page.errors.map((t) => names.get(t) ?? t).join(", ")}\n`);
  }
  if (notes.length === 0) {
    process.stdout.write(`${c.dim("No notes yet.")}\n`);
    return;
  }
  for (const n of notes) printRow(n, names.get(n.token) ?? n.token.slice(0, 8));
  if (page.nextBefore && !opts.list && !opts.symbol) {
    process.stdout.write(`\n${c.dim(`older notes: teemtape inbox --before ${page.nextBefore}`)}\n`);
  }
}

function printRow(n: ProNote, list: string): void {
  const src = n.source === "cli" ? c.yellow("agent") : c.dim("web");
  process.stdout.write(`${c.dim(rel(n.createdAt).padStart(8))}  ${c.bold(n.symbol.padEnd(8))} ${c.cyan(n.author)} ${src} ${c.dim(`· ${list}`)}\n`);
  process.stdout.write(`          ${n.body.split(/\r?\n/)[0]!.slice(0, 110)}${n.body.length > 110 || n.body.includes("\n") ? "…" : ""}\n`);
}

function rel(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return iso;
  const mins = Math.round((Date.now() - then) / 60000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.round(hours / 24)}d`;
}
