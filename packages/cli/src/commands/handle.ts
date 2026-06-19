import type { Context } from "../context.js";
import { generateHandle, setHandle } from "../handle.js";
import { c, printJson } from "../output.js";

export interface HandleOptions {
  generate?: boolean;
}

/**
 * `teemtape handle [name]` — show, set, or generate your anonymous handle.
 *
 *   teemtape handle             # show the current handle
 *   teemtape handle user1234    # claim a specific handle
 *   teemtape handle --generate  # get a fresh, unique handle
 */
export async function handleCommand(
  ctx: Context,
  name: string | undefined,
  opts: HandleOptions,
): Promise<void> {
  if (name) {
    const handle = await setHandle(ctx, name);
    return report(ctx, handle, "claimed");
  }
  if (opts.generate) {
    const handle = await generateHandle(ctx);
    return report(ctx, handle, "generated");
  }

  const current = ctx.config.handle;
  if (ctx.json) {
    printJson({ handle: current ?? null });
    return;
  }
  if (!current) {
    process.stdout.write(
      `${c.dim("No handle set yet.")} Run ${c.cyan("teemtape handle --generate")} or post a note to get one.\n`,
    );
    return;
  }
  process.stdout.write(`${c.bold("handle")}: ${c.cyan(current)}\n`);
}

function report(ctx: Context, handle: string, verb: string): void {
  if (ctx.json) {
    printJson({ handle });
    return;
  }
  process.stdout.write(`${c.green("✓")} Handle ${verb}: ${c.cyan(handle)}\n`);
  process.stdout.write(`  ${c.dim("saved locally · used as the author on notes you post")}\n`);
}
