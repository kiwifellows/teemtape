/** Runtime config for the web app (Vite env vars). */

const DEFAULTS = {
  apiUrl: "https://api.teemtape.com",
  webUrl: typeof window !== "undefined" ? window.location.origin : "https://www.teemtape.com",
};

export function getApiUrl(): string {
  return import.meta.env.VITE_API_URL || DEFAULTS.apiUrl;
}

/** Base URL used when building share links (/w/:token). */
export function getWebUrl(): string {
  return import.meta.env.VITE_WEB_URL || DEFAULTS.webUrl;
}

export function shareUrlForToken(token: string): string {
  return `${getWebUrl().replace(/\/$/, "")}/w/${token}`;
}

/** Short anonymous handle derived from a token (fallback when none is set). */
export function anonHandle(token: string): string {
  return `anon-${token.slice(0, 6)}`;
}

/** Allowed shape for a user-chosen anonymous handle (case-insensitive). */
export const HANDLE_PATTERN = /^[a-z][a-z0-9_-]{2,19}$/;

/** Normalize a handle the same way the API does (trim + lowercase). */
export function normalizeHandle(raw: string): string {
  return raw.trim().toLowerCase();
}

/** True when `raw` is a valid handle (after normalization). */
export function isValidHandle(raw: string): boolean {
  return HANDLE_PATTERN.test(normalizeHandle(raw));
}
