import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";

/** Resolved runtime configuration for a CLI invocation. */
export interface ResolvedConfig {
  apiUrl: string;
  webUrl: string;
  token?: string;
}

export interface ConfigFlags {
  apiUrl?: string;
  webUrl?: string;
  token?: string;
}

const DEFAULTS = {
  apiUrl: "http://localhost:8787",
  webUrl: "https://teemtape.app",
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
  };

  return {
    apiUrl: flags.apiUrl ?? env.apiUrl ?? file.apiUrl ?? DEFAULTS.apiUrl,
    webUrl: flags.webUrl ?? env.webUrl ?? file.webUrl ?? DEFAULTS.webUrl,
    token: flags.token ?? env.token ?? file.token,
  };
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
