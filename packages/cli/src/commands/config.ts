import type { Context } from "../context.js";
import { configFilePath, maskToken } from "../config.js";
import { c, printJson } from "../output.js";

/** `teemtape config` — show the resolved configuration (token masked). */
export async function configCommand(ctx: Context): Promise<void> {
  const view = {
    apiUrl: ctx.config.apiUrl,
    webUrl: ctx.config.webUrl,
    token: maskToken(ctx.config.token),
    handle: ctx.config.handle ?? "(none)",
    configFile: configFilePath(),
  };
  if (ctx.json) {
    printJson(view);
    return;
  }
  process.stdout.write(`${c.bold("teemtape config")}\n`);
  process.stdout.write(`  api url   : ${view.apiUrl}\n`);
  process.stdout.write(`  web url   : ${view.webUrl}\n`);
  process.stdout.write(`  token     : ${view.token}\n`);
  process.stdout.write(`  handle    : ${view.handle}\n`);
  process.stdout.write(`  ${c.dim(`config file: ${view.configFile}`)}\n`);
}
