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

/** Short anonymous handle shown in the compose footer. */
export function anonHandle(token: string): string {
  return `anon-${token.slice(0, 6)}`;
}
