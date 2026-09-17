import { createInterface } from "node:readline/promises";
import { TeemtapeClient } from "@teemtape/api-client";
import type { Context } from "../context.js";
import { clearConfig, maskToken, saveConfig } from "../config.js";
import { c, printJson } from "../output.js";

/**
 * `teemtape login [access-token]` — save a teemtape Pro personal access token.
 *
 * v1 is deliberately simple: create a token in the app, paste it here. The
 * token is verified with `GET /api/whoami` before it is saved. A device-code
 * flow can replace the paste step later without changing the stored config.
 */
export async function loginCommand(ctx: Context, given?: string): Promise<void> {
  const tokensUrl = `${ctx.config.dashboardUrl.replace(/\/$/, "")}/tokens`;
  let token = given?.trim();

  if (!token) {
    if (!process.stdin.isTTY) {
      throw new Error(`no access token given. Create one at ${tokensUrl} and run \`teemtape login <token>\`.`);
    }
    process.stdout.write(`Create an access token at ${c.cyan(tokensUrl)} and paste it below.\n`);
    const rl = createInterface({ input: process.stdin, output: process.stdout });
    try {
      token = (await rl.question("access token: ")).trim();
    } finally {
      rl.close();
    }
  }
  if (!token) throw new Error("no access token given.");

  // Verify before saving so a typo doesn't silently break every later call.
  const { user } = await new TeemtapeClient({ baseUrl: ctx.config.apiUrl, accessToken: token }).whoami();
  if (!user) {
    throw new Error(
      `the API at ${ctx.config.apiUrl} did not recognise that token. ` +
        `Check it at ${tokensUrl}, or confirm the API has teemtape Pro enabled.`,
    );
  }

  const path = saveConfig({ accessToken: token });
  ctx.config.accessToken = token;

  if (ctx.json) {
    printJson({ handle: user.handle, accessToken: maskToken(token), configPath: path });
    return;
  }
  process.stdout.write(`${c.green("✓")} Signed in as ${c.cyan(user.handle)}\n`);
  process.stdout.write(`  ${c.dim(`access token saved to ${path}`)}\n`);
}

/** `teemtape logout` — forget the saved access token. */
export async function logoutCommand(ctx: Context): Promise<void> {
  const had = Boolean(ctx.config.accessToken);
  const path = clearConfig(["accessToken"]);
  if (ctx.json) {
    printJson({ removed: had, configPath: path });
    return;
  }
  process.stdout.write(had ? `${c.green("✓")} Signed out\n` : `${c.dim("No access token was saved.")}\n`);
}
