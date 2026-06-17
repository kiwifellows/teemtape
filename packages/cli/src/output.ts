import type { Note, Quote } from "@teemtape/api-client";

const useColor = Boolean(process.stdout.isTTY) && !process.env.NO_COLOR;

const codes = {
  reset: "\x1b[0m",
  dim: "\x1b[2m",
  bold: "\x1b[1m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  cyan: "\x1b[36m",
} as const;

function paint(code: string, text: string): string {
  return useColor ? `${code}${text}${codes.reset}` : text;
}

export const c = {
  dim: (t: string) => paint(codes.dim, t),
  bold: (t: string) => paint(codes.bold, t),
  green: (t: string) => paint(codes.green, t),
  red: (t: string) => paint(codes.red, t),
  yellow: (t: string) => paint(codes.yellow, t),
  cyan: (t: string) => paint(codes.cyan, t),
};

export function printJson(value: unknown): void {
  process.stdout.write(`${JSON.stringify(value, null, 2)}\n`);
}

function money(n: number): string {
  return `$${n.toFixed(2)}`;
}

function signed(n: number): string {
  return `${n >= 0 ? "+" : ""}${n.toFixed(2)}`;
}

function pad(text: string, width: number): string {
  return text.length >= width ? text : text + " ".repeat(width - text.length);
}

function padStart(text: string, width: number): string {
  return text.length >= width ? text : " ".repeat(width - text.length) + text;
}

/** Render the watchlist quotes as an aligned table. */
export function printQuotesTable(quotes: Quote[], delayedSeconds: number, source: string): void {
  if (quotes.length === 0) {
    process.stdout.write(c.dim("No symbols on this watchlist yet. Add one with `teemtape add <SYMBOL>`.\n"));
    return;
  }

  const header = `${pad("SYMBOL", 8)}${pad("COMPANY", 26)}${padStart("LAST", 10)}  ${padStart("CHANGE", 18)}`;
  process.stdout.write(`${c.dim(header)}\n`);

  for (const q of quotes) {
    const changeText = `${signed(q.change)} (${signed(q.pct)}%)`;
    const colored = q.change >= 0 ? c.green(changeText) : c.red(changeText);
    const row =
      pad(q.symbol, 8) +
      pad(truncate(q.name, 25), 26) +
      padStart(money(q.price), 10) +
      "  " +
      padStartColored(colored, changeText, 18);
    process.stdout.write(`${row}\n`);
  }

  const mins = Math.round(delayedSeconds / 60);
  process.stdout.write(
    `\n${c.dim(`# prices delayed ~${mins} min · source: ${source}`)}\n`,
  );
}

/** Render a note thread for a symbol. */
export function printNotes(symbol: string, notes: Note[]): void {
  process.stdout.write(`${c.bold(symbol)} ${c.dim("notes")}\n`);
  process.stdout.write(`${c.dim("─".repeat(44))}\n`);
  if (notes.length === 0) {
    process.stdout.write(`${c.dim("No notes yet. Add one with `teemtape note " + symbol + ' --message "…"`.')}\n`);
    return;
  }
  for (const n of notes) {
    const src = n.source === "cli" ? c.yellow(`(cli, ${rel(n.createdAt)})`) : c.dim(`(web, ${rel(n.createdAt)})`);
    process.stdout.write(`${c.cyan(n.author)} ${src}\n`);
    process.stdout.write(`  ${n.body}\n`);
  }
}

function truncate(text: string, max: number): string {
  return text.length <= max ? text : `${text.slice(0, max - 1)}…`;
}

// Right-pad accounting for invisible ANSI codes by padding the plain text width.
function padStartColored(colored: string, plain: string, width: number): string {
  const padding = Math.max(0, width - plain.length);
  return " ".repeat(padding) + colored;
}

function rel(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return iso;
  const diffMs = Date.now() - then;
  const mins = Math.round(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}
