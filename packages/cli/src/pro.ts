import type { ResolvedConfig } from "./config.js";

/**
 * The slice of the teemtape Pro API (app.teemtape.com) the CLI uses. It is a
 * separate service from the public API — accounts, saved lists, the notes
 * inbox — and only ever reached with a Pro access token. Self-hosted setups
 * without Pro simply never call it.
 */

export interface ProWatchlist {
  token: string;
  name: string;
  description: string | null;
  linkAccess: "public-edit" | "public-comment" | "public-view" | "private";
  role: "owner" | "editor" | "commenter" | "viewer";
  url: string;
  createdAt: string;
}

export interface ProNote {
  id: string;
  token: string;
  symbol: string;
  author: string;
  source: "web" | "cli";
  body: string;
  createdAt: string;
}

export interface ProNotesPage {
  notes: ProNote[];
  nextBefore: string | null;
  lists: { token: string; name: string; role: string; linkAccess: string; canPost: boolean }[];
  truncatedLists: string[];
  errors: string[];
}

export class ProApiError extends Error {
  readonly status: number;
  readonly reason?: string;
  constructor(status: number, message: string, reason?: string) {
    super(message);
    this.name = "ProApiError";
    this.status = status;
    this.reason = reason;
  }
}

export class ProClient {
  readonly #baseUrl: string;
  readonly #accessToken: string;

  constructor(config: Pick<ResolvedConfig, "dashboardUrl" | "accessToken">) {
    if (!config.accessToken) {
      throw new Error("this command needs a teemtape Pro access token — run `teemtape login` first.");
    }
    this.#baseUrl = config.dashboardUrl.replace(/\/$/, "");
    this.#accessToken = config.accessToken;
  }

  async #request<T>(path: string): Promise<T> {
    const res = await fetch(`${this.#baseUrl}${path}`, {
      headers: { accept: "application/json", authorization: `Bearer ${this.#accessToken}` },
    });
    const text = await res.text();
    let body: Record<string, unknown> = {};
    try {
      body = text ? (JSON.parse(text) as Record<string, unknown>) : {};
    } catch {
      /* non-JSON error page */
    }
    if (!res.ok) {
      const message = typeof body.error === "string" ? body.error : `HTTP ${res.status}`;
      const reason = typeof body.reason === "string" ? body.reason : undefined;
      if (res.status === 401) {
        throw new ProApiError(401, `${this.#baseUrl} did not accept the saved access token (${message}). Run \`teemtape login\` again.`, reason);
      }
      throw new ProApiError(res.status, message, reason);
    }
    return body as T;
  }

  /** Saved lists the token can see (owned or member; narrowed to the token's scope). */
  async watchlists(): Promise<ProWatchlist[]> {
    return (await this.#request<{ watchlists: ProWatchlist[] }>("/api/watchlists")).watchlists;
  }

  /** Every note across those lists, newest first. */
  async notes(params: { limit?: number; before?: string } = {}): Promise<ProNotesPage> {
    const q = new URLSearchParams();
    if (params.limit) q.set("limit", String(params.limit));
    if (params.before) q.set("before", params.before);
    const qs = q.toString();
    return this.#request<ProNotesPage>(`/api/notes${qs ? `?${qs}` : ""}`);
  }
}
