/**
 * Exchanges and regulators publish their listings for public consumption but
 * expect a descriptive User-Agent. The SEC's fair-access policy wants the
 * exact shape `<app> <contact email>` and answers 403 to anything fancier
 * (a URL in parentheses is enough to be refused). Override with
 * TEEMTAPE_SYNC_USER_AGENT when self-hosting — keep the same shape.
 */
export const DEFAULT_USER_AGENT = "teemtape-symbols-sync contact@teemtape.com";

export interface FetchOptions {
  userAgent?: string;
  accept?: string;
  timeoutMs?: number;
}

/** GET a text resource with a descriptive UA and a timeout; throws on non-2xx. */
export async function fetchText(url: string, opts: FetchOptions = {}): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), opts.timeoutMs ?? 60_000);
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": opts.userAgent ?? process.env.TEEMTAPE_SYNC_USER_AGENT ?? DEFAULT_USER_AGENT,
        Accept: opts.accept ?? "*/*",
      },
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`);
    return await res.text();
  } finally {
    clearTimeout(timer);
  }
}
