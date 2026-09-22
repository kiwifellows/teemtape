import type { Env } from "./env.js";
import { HttpError } from "./http.js";

/**
 * Optional authorisation hook (see docs/authz-contract.md).
 *
 * The public API knows nothing about users, plans, or billing. When the AUTHZ
 * service binding is configured it asks that service one question per
 * watchlist request — "may this caller do this action on this list?" — and
 * enforces the answer. When the binding is absent (self-hosters, local dev)
 * every list behaves exactly as before: public, link-is-the-credential.
 */

export const AUTHZ_CONTRACT_VERSION = 1 as const;

/** What the caller is trying to do. `created` and `identify` are not list actions. */
export type AuthzAction = "view" | "add_symbol" | "post_note" | "manage" | "created" | "identify";

export type Role = "owner" | "editor" | "commenter" | "viewer" | "anonymous";

/** What the bare share link grants to non-members. `public-edit` is today's behaviour. */
export type LinkAccess = "public-edit" | "public-comment" | "public-view" | "private";

export type Credential = { type: "bearer"; value: string } | { type: "cookie"; value: string };

export interface AuthzRequest {
  v: typeof AUTHZ_CONTRACT_VERSION;
  action: AuthzAction;
  token?: string;
  credential?: Credential;
}

export interface AuthzResponse {
  allow: boolean;
  role?: Role;
  link_access?: LinkAccess;
  user?: { handle: string };
  reason?: "sign_in_required" | "forbidden";
  /** Every list action this caller may perform here (optional, additive). */
  grants?: ListAction[];
  /** `identify` only: the caller's most recently saved list (optional, additive). */
  last_watchlist?: { token: string; name?: string };
}

export type ListAction = Exclude<AuthzAction, "created" | "identify">;

/** Result of a successful authorisation, handed back to the router. */
export interface AuthzDecision {
  role: Role;
  linkAccess: LinkAccess;
  user?: { handle: string };
  /** What the caller may do on this list; surfaced to clients as `access.can`. */
  grants: ReadonlySet<ListAction>;
}

/** The `access` block returned with a watchlist, for UIs to explain permissions. */
export interface WatchlistAccess {
  role: Role;
  linkAccess: LinkAccess;
  can: { addSymbol: boolean; postNote: boolean; manage: boolean };
  user: { handle: string } | null;
}

export function toWatchlistAccess(d: AuthzDecision): WatchlistAccess {
  return {
    role: d.role,
    linkAccess: d.linkAccess,
    can: { addSymbol: d.grants.has("add_symbol"), postNote: d.grants.has("post_note"), manage: d.grants.has("manage") },
    user: d.user ?? null,
  };
}

const ALL_ACTIONS: ReadonlySet<string> = new Set<ListAction>(["view", "add_symbol", "post_note", "manage"]);

/** `grants` from the authoriser when present, else what the link alone allows. */
function grantsOf(result: AuthzResponse, linkAccess: LinkAccess): ReadonlySet<ListAction> {
  if (Array.isArray(result.grants)) {
    return new Set(result.grants.filter((a): a is ListAction => typeof a === "string" && ALL_ACTIONS.has(a)));
  }
  return LINK_GRANTS[linkAccess];
}

const CACHE_PREFIX = "authz:v1:";
const CACHE_TTL_SECONDS = 60;
const DEFAULT_TIMEOUT_MS = 250;
const LINK_ACCESS_VALUES: ReadonlySet<string> = new Set<LinkAccess>([
  "public-edit",
  "public-comment",
  "public-view",
  "private",
]);

/** Which list actions each link-access level grants to an anonymous caller. */
const LINK_GRANTS: Record<LinkAccess, ReadonlySet<ListAction>> = {
  "public-edit": new Set(["view", "add_symbol", "post_note"]),
  "public-comment": new Set(["view", "post_note"]),
  "public-view": new Set(["view"]),
  private: new Set(),
};

/** Extract the caller's credential: a bearer PAT (CLI/agents) or the raw Cookie header (browser). */
export function extractCredential(request: Request): Credential | undefined {
  const auth = request.headers.get("authorization");
  if (auth) {
    const m = auth.match(/^Bearer\s+(.+)$/i);
    if (m && m[1]) return { type: "bearer", value: m[1].trim() };
  }
  const cookie = request.headers.get("cookie");
  if (cookie) return { type: "cookie", value: cookie };
  return undefined;
}

function timeoutMs(env: Env): number {
  const n = Number(env.AUTHZ_TIMEOUT_MS ?? DEFAULT_TIMEOUT_MS);
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_TIMEOUT_MS;
}

function asLinkAccess(value: unknown): LinkAccess | undefined {
  return typeof value === "string" && LINK_ACCESS_VALUES.has(value) ? (value as LinkAccess) : undefined;
}

async function readCachedLinkAccess(env: Env, token: string): Promise<LinkAccess | undefined> {
  return asLinkAccess(await env.QUOTES_CACHE.get(CACHE_PREFIX + token));
}

async function writeCachedLinkAccess(env: Env, token: string, linkAccess: LinkAccess): Promise<void> {
  await env.QUOTES_CACHE.put(CACHE_PREFIX + token, linkAccess, { expirationTtl: CACHE_TTL_SECONDS });
}

/**
 * Call the AUTHZ service. Throws on transport error, non-2xx, malformed body,
 * or timeout — callers decide what a failure means.
 */
export async function callAuthz(env: Env, body: AuthzRequest): Promise<AuthzResponse> {
  const authz = env.AUTHZ;
  if (!authz) throw new Error("AUTHZ binding not configured");

  const res = await authz.fetch("https://authz/authz", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(timeoutMs(env)),
  });
  if (!res.ok) throw new Error(`AUTHZ responded ${res.status}`);

  const data = (await res.json()) as Partial<AuthzResponse> | null;
  if (!data || typeof data.allow !== "boolean") throw new Error("AUTHZ returned a malformed response");
  return data as AuthzResponse;
}

function denied(env: Env, reason: AuthzResponse["reason"], hasCredential: boolean): HttpError {
  const status = reason === "forbidden" || (hasCredential && reason !== "sign_in_required") ? 403 : 401;
  const finalReason = status === 403 ? "forbidden" : "sign_in_required";
  const message =
    status === 403
      ? "you do not have permission to do that on this watchlist"
      : "this watchlist is private — sign in to continue";
  const extraBody: Record<string, unknown> = { reason: finalReason };
  if (env.DASHBOARD_URL) extraBody.signInUrl = env.DASHBOARD_URL;
  return new HttpError(status, message, undefined, extraBody);
}

/**
 * Authorise `action` on watchlist `token` for the caller of `request`.
 *
 * Behaviour:
 *  - no AUTHZ binding                 → allow (today's behaviour)
 *  - anonymous caller + cached link
 *    access that grants the action    → allow without calling AUTHZ
 *  - AUTHZ error / timeout            → allow unless the list is cached as
 *                                       restricted, in which case 503
 *  - allow=false                      → 401 (sign in) / 403 (forbidden)
 */
export async function authorize(
  request: Request,
  env: Env,
  token: string,
  action: Exclude<AuthzAction, "created" | "identify">,
): Promise<AuthzDecision> {
  if (!env.AUTHZ) return { role: "anonymous", linkAccess: "public-edit", grants: LINK_GRANTS["public-edit"] };

  const credential = extractCredential(request);

  // Fast path: an anonymous caller on a list we recently learned is open enough.
  if (!credential) {
    const cached = await readCachedLinkAccess(env, token);
    if (cached && LINK_GRANTS[cached].has(action)) {
      return { role: "anonymous", linkAccess: cached, grants: LINK_GRANTS[cached] };
    }
  }

  let result: AuthzResponse;
  try {
    result = await callAuthz(env, { v: AUTHZ_CONTRACT_VERSION, action, token, credential });
  } catch (err) {
    console.error("AUTHZ call failed", err);
    const cached = await readCachedLinkAccess(env, token);
    if (cached && cached !== "public-edit") {
      throw new HttpError(503, "authorisation service unavailable", { "retry-after": "5" });
    }
    const linkAccess = cached ?? "public-edit";
    return { role: "anonymous", linkAccess, grants: LINK_GRANTS[linkAccess] };
  }

  const linkAccess = result.link_access ?? "public-edit";
  await writeCachedLinkAccess(env, token, linkAccess);

  if (!result.allow) throw denied(env, result.reason, credential !== undefined);

  return { role: result.role ?? "anonymous", linkAccess, user: result.user, grants: grantsOf(result, linkAccess) };
}

/** What `GET /api/whoami` reports about the caller. */
export interface Identity {
  user: { handle: string } | null;
  /**
   * The caller's most recently saved watchlist, when the authoriser tracks
   * them. The API neither stores nor orders these — it only passes the
   * answer through, so the web app can open the list you were last on
   * instead of minting a fresh one on every visit to the home page.
   */
  lastWatchlist: { token: string; name: string | null } | null;
}

const ANONYMOUS: Identity = { user: null, lastWatchlist: null };

/** A list reference is only worth passing on if it is a real token shape. */
function asLastWatchlist(raw: AuthzResponse["last_watchlist"]): Identity["lastWatchlist"] {
  if (!raw || typeof raw.token !== "string" || !/^[0-9a-f]{32}$/.test(raw.token)) return null;
  return { token: raw.token, name: typeof raw.name === "string" ? raw.name : null };
}

/** Who is the caller? Anonymous when there is no credential or no AUTHZ binding. */
export async function identify(request: Request, env: Env): Promise<Identity> {
  if (!env.AUTHZ) return ANONYMOUS;
  const credential = extractCredential(request);
  if (!credential) return ANONYMOUS;
  try {
    const result = await callAuthz(env, { v: AUTHZ_CONTRACT_VERSION, action: "identify", credential });
    if (!result.user) return ANONYMOUS;
    return { user: result.user, lastWatchlist: asLastWatchlist(result.last_watchlist) };
  } catch (err) {
    console.error("AUTHZ identify failed", err);
    return ANONYMOUS;
  }
}

/**
 * Tell AUTHZ that a signed-in caller just created a watchlist so it can record
 * ownership. Fire-and-forget: never affects the response.
 */
export async function notifyCreated(request: Request, env: Env, token: string): Promise<void> {
  if (!env.AUTHZ) return;
  const credential = extractCredential(request);
  if (!credential) return;
  try {
    await callAuthz(env, { v: AUTHZ_CONTRACT_VERSION, action: "created", token, credential });
  } catch (err) {
    console.error("AUTHZ created notification failed", err);
  }
}
