import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";

/** Resolved runtime configuration for a CLI invocation. */
export interface ResolvedConfig {
  apiUrl: string;
  webUrl: string;
  token?: string;
  /** Anonymous handle (e.g. "user1234") attached to notes posted from the CLI. */
  handle?: string;
  /**
   * teemtape Pro personal access token, sent as `Authorization: Bearer …`.
   * Unlocks private watchlists and role checks on the hosted API; harmless
   * against a self-hosted API without the authorisation hook.
   */
  accessToken?: string;
  /** Base URL of the teemtape Pro app (where access tokens are created). */
  dashboardUrl: string;
}

export interface ConfigFlags {
  apiUrl?: string;
  webUrl?: string;
  token?: string;
  handle?: string;
  accessToken?: string;
  dashboardUrl?: string;
}

const DEFAULTS = {
  apiUrl: "https://api.teemtape.com",
  webUrl: "https://www.teemtape.com",
  dashboardUrl: "https://app.teemtape.com",
};

/** Path to the persisted config file (XDG-aware, falls back to ~/.config). */
export function configFilePath(): string {
  const base = process.env.XDG_CONFIG_HOME || join(homedir(), ".config");
  return join(base, "teemtape", "config.json");
}

interface StoredConfig {
  apiUrl?: string;
  webUrl?: string;
  token?: string;
  handle?: string;
  accessToken?: string;
  dashboardUrl?: string;
}

function readConfigFile(): StoredConfig {
  try {
    return JSON.parse(readFileSync(configFilePath(), "utf8")) as StoredConfig;
  } catch {
    return {};
  }
}

/**
 * Resolve config with precedence: CLI flags > environment > config file > defaults.
 * (See docs/cli-options.md.)
 */
export function resolveConfig(flags: ConfigFlags = {}): ResolvedConfig {
  const file = readConfigFile();
  const env = {
    apiUrl: process.env.TEEMTAPE_API_URL,
    webUrl: process.env.TEEMTAPE_WEB_URL,
    token: process.env.TEEMTAPE_TOKEN,
    handle: process.env.TEEMTAPE_HANDLE,
    accessToken: process.env.TEEMTAPE_ACCESS_TOKEN,
    dashboardUrl: process.env.TEEMTAPE_DASHBOARD_URL,
  };

  return {
    apiUrl: flags.apiUrl ?? env.apiUrl ?? file.apiUrl ?? DEFAULTS.apiUrl,
    webUrl: flags.webUrl ?? env.webUrl ?? file.webUrl ?? DEFAULTS.webUrl,
    token: flags.token ?? env.token ?? file.token,
    handle: flags.handle ?? env.handle ?? file.handle,
    accessToken: flags.accessToken ?? env.accessToken ?? file.accessToken,
    dashboardUrl: flags.dashboardUrl ?? env.dashboardUrl ?? file.dashboardUrl ?? DEFAULTS.dashboardUrl,
  };
}

/** Remove keys from the config file (e.g. `teemtape logout`). */
export function clearConfig(keys: Array<keyof StoredConfig>): string {
  const path = configFilePath();
  const current = readConfigFile();
  for (const key of keys) delete current[key];
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(current, null, 2)}\n`, { mode: 0o600 });
  return path;
}

/** Persist values to the config file (merges with existing). */
export function saveConfig(patch: StoredConfig): string {
  const path = configFilePath();
  const merged = { ...readConfigFile(), ...patch };
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(merged, null, 2)}\n`, { mode: 0o600 });
  return path;
}

/** Mask a token for display so it never gets fully printed/logged. */
export function maskToken(token?: string): string {
  if (!token) return "(none)";
  if (token.length <= 8) return "****";
  return `${token.slice(0, 6)}…${token.slice(-2)}`;
}
