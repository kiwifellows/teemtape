import { saveConfig } from "./config.js";
import type { Context } from "./context.js";

/** Allowed shape for a user-chosen anonymous handle (case-insensitive). */
const HANDLE_RE = /^[a-z][a-z0-9_-]{2,19}$/;

/** Normalize a handle the same way the API does (trim + lowercase). */
export function normalizeHandle(raw: string): string {
  return raw.trim().toLowerCase();
}

/** Validate a handle locally before hitting the API, with a friendly message. */
export function assertValidHandle(raw: string): string {
  const handle = normalizeHandle(raw);
  if (!HANDLE_RE.test(handle)) {
    throw new Error(
      "invalid handle: use 3-20 characters (letters, numbers, - or _) starting with a letter",
    );
  }
  return handle;
}

/**
 * Return the configured handle, generating and persisting a unique one on first
 * use. Mirrors the web flow: a handle is auto-created and saved so notes carry a
 * stable identity, and the user can change it later with `teemtape handle`.
 */
export async function ensureHandle(ctx: Context): Promise<string> {
  if (ctx.config.handle) return ctx.config.handle;
  const { handle } = await ctx.client.createHandle();
  saveConfig({ handle });
  ctx.config.handle = handle;
  return handle;
}

/** Claim a specific handle and persist it. Throws on invalid/taken handles. */
export async function setHandle(ctx: Context, requested: string): Promise<string> {
  const wanted = assertValidHandle(requested);
  const { handle } = await ctx.client.createHandle(wanted);
  saveConfig({ handle });
  ctx.config.handle = handle;
  return handle;
}

/** Generate a fresh unique handle and persist it. */
export async function generateHandle(ctx: Context): Promise<string> {
  const { handle } = await ctx.client.createHandle();
  saveConfig({ handle });
  ctx.config.handle = handle;
  return handle;
}
