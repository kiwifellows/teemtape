import type {
  CreateNoteInput,
  Note,
  NotesResponse,
  QuotesResponse,
  SymbolsListResponse,
  Watchlist,
} from "./types.js";

export interface ApiClientOptions {
  /** Base URL of the Worker API, e.g. http://localhost:8787 */
  baseUrl: string;
  /** Optional default watchlist token used by watchlist/note calls. */
  token?: string;
  /** Injectable fetch (defaults to global fetch); handy for tests. */
  fetch?: typeof fetch;
}

/** Thrown for any non-2xx API response. */
export class ApiError extends Error {
  readonly status: number;
  readonly body: unknown;

  constructor(status: number, message: string, body: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.body = body;
  }
}

/**
 * Minimal typed client for the teemtape Worker API. The same contract is reused
 * by the CLI now and the web/native apps later (see docs/cli-options.md).
 */
export class TeemtapeClient {
  private readonly baseUrl: string;
  private readonly token?: string;
  private readonly fetchImpl: typeof fetch;

  constructor(options: ApiClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/$/, "");
    this.token = options.token;
    this.fetchImpl = options.fetch ?? globalThis.fetch;
    if (typeof this.fetchImpl !== "function") {
      throw new Error("No fetch implementation available (need Node 18+ or pass options.fetch).");
    }
  }

  /** Delayed quotes for the given symbols. */
  async getQuotes(symbols: string[]): Promise<QuotesResponse> {
    const query = encodeURIComponent(symbols.join(","));
    return this.request<QuotesResponse>(`/api/quotes?symbols=${query}`);
  }

  /** Paginated SEC symbol catalog with optional search and sort. */
  async listSymbols(params: {
    offset?: number;
    limit?: number;
    sort?: "ticker" | "title";
    q?: string;
    symbol?: string;
    name?: string;
  } = {}): Promise<SymbolsListResponse> {
    const search = new URLSearchParams();
    if (params.offset !== undefined) search.set("offset", String(params.offset));
    if (params.limit !== undefined) search.set("limit", String(params.limit));
    if (params.sort) search.set("sort", params.sort);
    if (params.q) search.set("q", params.q);
    if (params.symbol) search.set("symbol", params.symbol);
    if (params.name) search.set("name", params.name);
    const qs = search.toString();
    return this.request<SymbolsListResponse>(`/api/symbols${qs ? `?${qs}` : ""}`);
  }

  /** Create a new anonymous watchlist and return its MD5 token. */
  async createWatchlist(): Promise<Watchlist> {
    return this.request<Watchlist>(`/api/watchlists`, { method: "POST" });
  }

  /** Fetch a watchlist (symbols + metadata) by token. */
  async getWatchlist(token = this.requireToken()): Promise<Watchlist> {
    return this.request<Watchlist>(`/api/w/${token}`);
  }

  /** Add a symbol to a watchlist. */
  async addSymbol(symbol: string, token = this.requireToken()): Promise<Watchlist> {
    return this.request<Watchlist>(`/api/w/${token}/symbols`, {
      method: "POST",
      body: JSON.stringify({ symbol: symbol.toUpperCase() }),
    });
  }

  /** Notes for a symbol on a watchlist. */
  async getNotes(symbol: string, token = this.requireToken()): Promise<NotesResponse> {
    const query = encodeURIComponent(symbol.toUpperCase());
    return this.request<NotesResponse>(`/api/w/${token}/notes?symbol=${query}`);
  }

  /** Post an anonymous note to a symbol. */
  async addNote(input: CreateNoteInput, token = this.requireToken()): Promise<Note> {
    return this.request<Note>(`/api/w/${token}/notes`, {
      method: "POST",
      body: JSON.stringify({ ...input, symbol: input.symbol.toUpperCase() }),
    });
  }

  private requireToken(): string {
    if (!this.token) {
      throw new Error("A watchlist token is required. Pass --token or set TEEMTAPE_TOKEN.");
    }
    return this.token;
  }

  private async request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const headers = new Headers(init.headers);
    if (init.body && !headers.has("content-type")) {
      headers.set("content-type", "application/json");
    }
    headers.set("accept", "application/json");

    const res = await this.fetchImpl(`${this.baseUrl}${path}`, { ...init, headers });
    const text = await res.text();
    const data = text ? safeJsonParse(text) : undefined;

    if (!res.ok) {
      const message =
        (isRecord(data) && typeof data.error === "string" && data.error) ||
        `Request to ${path} failed with ${res.status}`;
      throw new ApiError(res.status, message, data);
    }
    return data as T;
  }
}

function safeJsonParse(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
