import type { Context } from "../context.js";
import { c, printJson, printSymbolsTable } from "../output.js";

export interface SearchOptions {
  symbol?: string;
  name?: string;
  limit?: string;
  offset?: string;
  sort?: "ticker" | "title";
}

/** `teemtape search` — find symbols in the SEC catalog by ticker or company name. */
export async function searchCommand(
  ctx: Context,
  query: string | undefined,
  opts: SearchOptions,
): Promise<void> {
  const q = query?.trim();
  const symbol = opts.symbol?.trim();
  const name = opts.name?.trim();

  if (!q && !symbol && !name) {
    process.stderr.write(
      `${c.red("error:")} provide a search query, or use --symbol and/or --name.\n`,
    );
    process.exitCode = 1;
    return;
  }

  const res = await ctx.client.listSymbols({
    ...(q ? { q } : {}),
    ...(symbol ? { symbol } : {}),
    ...(name ? { name } : {}),
    ...(opts.limit !== undefined ? { limit: parsePositiveInt(opts.limit, "limit") } : { limit: 20 }),
    ...(opts.offset !== undefined ? { offset: parsePositiveInt(opts.offset, "offset") } : {}),
    ...(opts.sort ? { sort: opts.sort } : {}),
  });

  if (ctx.json) {
    printJson(res);
    return;
  }

  printSymbolsTable(res);
}

function parsePositiveInt(raw: string, label: string): number {
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n) || n < 0) {
    throw new Error(`invalid ${label}: ${raw}`);
  }
  return n;
}
