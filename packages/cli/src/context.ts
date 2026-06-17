import { TeemtapeClient } from "@teemtape/api-client";
import { resolveConfig, type ConfigFlags, type ResolvedConfig } from "./config.js";

export interface GlobalFlags extends ConfigFlags {
  json?: boolean;
}

export interface Context {
  config: ResolvedConfig;
  json: boolean;
  client: TeemtapeClient;
}

/** Build the per-invocation context (resolved config + a ready API client). */
export function createContext(flags: GlobalFlags): Context {
  const config = resolveConfig(flags);
  const client = new TeemtapeClient({ baseUrl: config.apiUrl, token: config.token });
  return { config, json: Boolean(flags.json), client };
}
