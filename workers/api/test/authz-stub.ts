/**
 * In-process stand-in for the private authorisation service, used as the AUTHZ
 * service binding in tests (see vitest.config.ts). It implements the contract in
 * docs/authz-contract.md over a tiny in-memory model that tests configure via
 * control endpoints (`/__set`, `/__reset`, `/__created`):
 *
 *   - bearer `pat-<handle>` and cookie `session=<handle>` identify <handle>
 *   - a list is `public-edit` with no members unless `/__set` says otherwise
 *   - `delayMs` / `fail` on a list simulate a slow or broken service
 *
 * Unknown lists are public, so the existing API tests run unchanged with the
 * binding present — which is exactly how the real pro API behaves.
 */

type Role = "owner" | "editor" | "commenter" | "viewer";
type LinkAccess = "public-edit" | "public-comment" | "public-view" | "private";

interface ListState {
  link_access: LinkAccess;
  members: Record<string, Role>;
  delayMs?: number;
  fail?: boolean;
}

const ROLE_GRANTS: Record<Role, string[]> = {
  owner: ["view", "add_symbol", "post_note", "manage"],
  editor: ["view", "add_symbol", "post_note"],
  commenter: ["view", "post_note"],
  viewer: ["view"],
};

const LINK_GRANTS: Record<LinkAccess, string[]> = {
  "public-edit": ["view", "add_symbol", "post_note"],
  "public-comment": ["view", "post_note"],
  "public-view": ["view"],
  private: [],
};

const lists = new Map<string, ListState>();
const created: Array<{ token: string; handle: string }> = [];

function handleFromCredential(credential?: { type: string; value: string }): string | undefined {
  if (!credential) return undefined;
  if (credential.type === "bearer") return credential.value.startsWith("pat-") ? credential.value.slice(4) : undefined;
  const m = credential.value.match(/(?:^|;\s*)session=([^;]+)/);
  return m?.[1];
}

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json" } });

export async function authzStub(request: Request): Promise<Response> {
  const path = new URL(request.url).pathname;
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;

  if (path === "/__reset") {
    lists.clear();
    created.length = 0;
    return json({ ok: true });
  }
  if (path === "/__set") {
    lists.set(body.token as string, {
      link_access: (body.link_access as LinkAccess) ?? "public-edit",
      members: (body.members as Record<string, Role>) ?? {},
      delayMs: body.delayMs as number | undefined,
      fail: body.fail as boolean | undefined,
    });
    return json({ ok: true });
  }
  if (path === "/__created") return json(created);
  if (path !== "/authz") return json({ error: "not found" }, 404);

  const action = body.action as string;
  const token = body.token as string | undefined;
  const credential = body.credential as { type: string; value: string } | undefined;
  const handle = handleFromCredential(credential);

  if (action === "identify") {
    return json(handle ? { allow: true, user: { handle } } : { allow: false, reason: "sign_in_required" });
  }
  if (action === "created") {
    if (token && handle) created.push({ token, handle });
    return json({ allow: true });
  }

  const state = (token && lists.get(token)) || { link_access: "public-edit" as LinkAccess, members: {} };
  if (state.delayMs) await new Promise((r) => setTimeout(r, state.delayMs));
  if (state.fail) return json({ error: "boom" }, 500);

  const role = handle ? state.members[handle] : undefined;
  const user = handle ? { handle } : undefined;
  if (role) {
    const allow = ROLE_GRANTS[role].includes(action);
    return json({ allow, role, link_access: state.link_access, user, reason: allow ? undefined : "forbidden" });
  }
  const allow = LINK_GRANTS[state.link_access].includes(action);
  return json({
    allow,
    role: "anonymous",
    link_access: state.link_access,
    user,
    reason: allow ? undefined : handle ? "forbidden" : "sign_in_required",
  });
}
