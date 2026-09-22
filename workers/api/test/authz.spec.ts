import { env, SELF } from "cloudflare:test";
import { beforeEach, describe, expect, it } from "vitest";
import { authorize, extractCredential, identify } from "../src/authz.js";
import type { Env } from "../src/env.js";

const BASE = "https://api.test";

async function control(path: string, body?: unknown) {
  const res = await env.AUTHZ!.fetch(`https://authz${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body ?? {}),
  });
  return res.json();
}

async function newList(headers: Record<string, string> = {}): Promise<string> {
  const res = await SELF.fetch(`${BASE}/api/watchlists`, { method: "POST", headers });
  return ((await res.json()) as { token: string }).token;
}

function get(path: string, headers: Record<string, string> = {}) {
  return SELF.fetch(`${BASE}${path}`, { headers });
}

function post(path: string, body: unknown, headers: Record<string, string> = {}) {
  return SELF.fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
}

const asAlice = { authorization: "Bearer pat-alice" };
const asBobCookie = { cookie: "theme=dark; session=bob" };

describe("authz hook", () => {
  beforeEach(async () => {
    await control("/__reset");
  });

  describe("with no AUTHZ binding (self-hosted / today's behaviour)", () => {
    const unbound = { ...env, AUTHZ: undefined } as unknown as Env;

    it("allows every action as anonymous on a public-edit list", async () => {
      const req = new Request("https://api.test/api/w/x");
      for (const action of ["view", "add_symbol", "post_note", "manage"] as const) {
        await expect(authorize(req, unbound, "a".repeat(32), action)).resolves.toEqual({
          role: "anonymous",
          linkAccess: "public-edit",
          grants: new Set(["view", "add_symbol", "post_note"]),
        });
      }
    });

    it("identifies nobody", async () => {
      const req = new Request("https://api.test/api/whoami", { headers: asAlice });
      await expect(identify(req, unbound)).resolves.toEqual({ user: null, lastWatchlist: null });
    });
  });

  describe("credential extraction", () => {
    it("prefers a bearer token, falls back to the raw cookie header, else none", () => {
      expect(extractCredential(new Request("https://x", { headers: { authorization: "Bearer  abc " } }))).toEqual({
        type: "bearer",
        value: "abc",
      });
      expect(extractCredential(new Request("https://x", { headers: { cookie: "a=1; b=2" } }))).toEqual({
        type: "cookie",
        value: "a=1; b=2",
      });
      expect(extractCredential(new Request("https://x", { headers: { authorization: "Basic zzz" } }))).toBeUndefined();
      expect(extractCredential(new Request("https://x"))).toBeUndefined();
    });
  });

  describe("public lists (unknown to the authorisation service)", () => {
    it("behave exactly as before for anonymous callers", async () => {
      const token = await newList();
      expect((await post(`/api/w/${token}/symbols`, { symbol: "NVDA" })).status).toBe(200);
      expect((await post(`/api/w/${token}/notes`, { symbol: "NVDA", body: "hi" })).status).toBe(201);
      expect((await get(`/api/w/${token}`)).status).toBe(200);
      expect((await get(`/api/w/${token}/notes?symbol=NVDA`)).status).toBe(200);
      expect((await get(`/api/w/${token}/agent`)).status).toBe(200);
    });
  });

  describe("link access", () => {
    it("private: anonymous gets 401 with a sign-in URL; a member gets through", async () => {
      const token = await newList();
      await control("/__set", { token, link_access: "private", members: { alice: "viewer" } });

      const anon = await get(`/api/w/${token}`);
      expect(anon.status).toBe(401);
      expect(await anon.json()).toEqual({
        error: expect.stringContaining("private"),
        reason: "sign_in_required",
        signInUrl: "https://app.test",
      });

      expect((await get(`/api/w/${token}`, asAlice)).status).toBe(200);
    });

    it("public-view: anyone can read, nobody anonymous can write", async () => {
      const token = await newList();
      await control("/__set", { token, link_access: "public-view" });

      expect((await get(`/api/w/${token}`)).status).toBe(200);
      const write = await post(`/api/w/${token}/notes`, { symbol: "NVDA", body: "hi" });
      expect(write.status).toBe(401);
    });

    it("public-comment: anonymous can post notes but not add symbols", async () => {
      const token = await newList();
      await control("/__set", { token, link_access: "public-comment" });
      expect((await post(`/api/w/${token}/symbols`, { symbol: "NVDA" })).status).toBe(401);
      // a signed-in non-member is bound by link access too, but gets 403 rather than 401
      expect((await post(`/api/w/${token}/symbols`, { symbol: "NVDA" }, asAlice)).status).toBe(403);
      expect((await post(`/api/w/${token}/notes`, { symbol: "NVDA", body: "hi" })).status).toBe(201);
    });
  });

  describe("access block on GET /api/w/:token", () => {
    const access = async (token: string, headers: Record<string, string> = {}) =>
      ((await (await get(`/api/w/${token}`, headers)).json()) as { access: unknown }).access;

    it("tells the UI what the caller may do, and who they are", async () => {
      const token = await newList();
      await control("/__set", { token, link_access: "public-view", members: { alice: "commenter" } });

      expect(await access(token)).toEqual({
        role: "anonymous",
        linkAccess: "public-view",
        can: { addSymbol: false, postNote: false, manage: false },
        user: null,
      });
      expect(await access(token, asAlice)).toEqual({
        role: "commenter",
        linkAccess: "public-view",
        can: { addSymbol: false, postNote: true, manage: false },
        user: { handle: "alice" },
      });
      // signed in but not a member: bound by the link, but we still say who they are
      expect(await access(token, asBobCookie)).toMatchObject({ role: "anonymous", can: { postNote: false }, user: { handle: "bob" } });
    });

    it("derives `can` from link access when the authoriser sends no grants", async () => {
      const token = await newList();
      await control("/__set", { token, link_access: "public-comment", omitGrants: true });
      expect(await access(token)).toMatchObject({ can: { addSymbol: false, postNote: true, manage: false } });
    });

    it("is fully open with no binding", async () => {
      const token = await newList();
      const res = await SELF.fetch(`${BASE}/api/w/${token}`);
      const body = (await res.json()) as { access: { can: Record<string, boolean> } };
      // the test binding is present, so this exercises the public-edit default for an unknown list
      expect(body.access.can).toEqual({ addSymbol: true, postNote: true, manage: false });
    });
  });

  describe("roles", () => {
    it("viewer cannot post; commenter cannot add symbols; editor can do both", async () => {
      const token = await newList();
      await control("/__set", {
        token,
        link_access: "private",
        members: { alice: "viewer", bob: "commenter", carol: "editor" },
      });

      // viewer
      expect((await get(`/api/w/${token}`, asAlice)).status).toBe(200);
      const viewerPost = await post(`/api/w/${token}/notes`, { symbol: "NVDA", body: "x" }, asAlice);
      expect(viewerPost.status).toBe(403);
      expect(await viewerPost.json()).toMatchObject({ reason: "forbidden", signInUrl: "https://app.test" });

      // commenter (via session cookie, like the browser)
      expect((await post(`/api/w/${token}/symbols`, { symbol: "NVDA" }, asBobCookie)).status).toBe(403);
      // seed the symbol as editor so the note has something to attach to
      expect((await post(`/api/w/${token}/symbols`, { symbol: "NVDA" }, { authorization: "Bearer pat-carol" })).status).toBe(200);
      expect((await post(`/api/w/${token}/notes`, { symbol: "NVDA", body: "x" }, asBobCookie)).status).toBe(201);
    });

    it("a signed-in non-member on a private list gets 403, not 401", async () => {
      const token = await newList();
      await control("/__set", { token, link_access: "private", members: {} });
      const res = await get(`/api/w/${token}`, asAlice);
      expect(res.status).toBe(403);
    });
  });

  describe("whoami and created", () => {
    it("reports the caller's handle, or null when anonymous", async () => {
      expect(await (await get("/api/whoami")).json()).toEqual({ user: null, lastWatchlist: null });
      expect(await (await get("/api/whoami", asAlice)).json()).toEqual({
        user: { handle: "alice" },
        lastWatchlist: null,
      });
      expect(await (await get("/api/whoami", asBobCookie)).json()).toEqual({
        user: { handle: "bob" },
        lastWatchlist: null,
      });
    });

    it("passes through the caller's most recently saved list", async () => {
      const token = await newList(asAlice);
      await control("/__last", { handle: "alice", token, name: "Energy" });
      expect(await (await get("/api/whoami", asAlice)).json()).toEqual({
        user: { handle: "alice" },
        lastWatchlist: { token, name: "Energy" },
      });
      // Anonymous callers never get one, even when the handle has a list.
      expect(await (await get("/api/whoami")).json()).toEqual({ user: null, lastWatchlist: null });
    });

    it("ignores a last list that is not a watchlist token", async () => {
      await control("/__last", { handle: "alice", token: "../../etc/passwd" });
      expect(await (await get("/api/whoami", asAlice)).json()).toEqual({
        user: { handle: "alice" },
        lastWatchlist: null,
      });
    });

    it("notifies the authorisation service when a signed-in caller creates a list", async () => {
      const token = await newList(asAlice);
      await newList(); // anonymous — must not be reported
      // waitUntil work is flushed once the response completes; poll briefly.
      let events: Array<{ token: string; handle: string }> = [];
      for (let i = 0; i < 20 && events.length === 0; i++) {
        events = (await control("/__created")) as typeof events;
        if (events.length === 0) await new Promise((r) => setTimeout(r, 10));
      }
      expect(events).toEqual([{ token, handle: "alice" }]);
    });
  });

  describe("resilience", () => {
    it("fails open for a list not known to be restricted when the service errors", async () => {
      const token = await newList();
      await control("/__set", { token, link_access: "public-edit", fail: true });
      expect((await get(`/api/w/${token}`)).status).toBe(200);
    });

    it("fails closed (503) for a list cached as restricted when the service times out", async () => {
      const token = await newList();
      await control("/__set", { token, link_access: "private", members: { alice: "viewer" } });
      await get(`/api/w/${token}`, asAlice); // primes the link_access cache

      await control("/__set", { token, link_access: "private", members: { alice: "viewer" }, delayMs: 800 });
      const res = await get(`/api/w/${token}`, asAlice);
      expect(res.status).toBe(503);
      expect(res.headers.get("retry-after")).toBe("5");
    });

    it("serves anonymous callers on a cached public list without calling the service", async () => {
      const token = await newList();
      await get(`/api/w/${token}`); // primes cache as public-edit
      await control("/__set", { token, link_access: "public-edit", fail: true });
      expect((await post(`/api/w/${token}/notes`, { symbol: "NVDA", body: "x" })).status).toBe(201);
    });
  });

  describe("CORS", () => {
    it("echoes a configured origin with allow-credentials, keeps * for others", async () => {
      const ours = await get("/health", { origin: "https://web.test" });
      expect(ours.headers.get("access-control-allow-origin")).toBe("https://web.test");
      expect(ours.headers.get("access-control-allow-credentials")).toBe("true");
      expect(ours.headers.get("vary")).toContain("origin");

      const theirs = await get("/health", { origin: "https://evil.test" });
      expect(theirs.headers.get("access-control-allow-origin")).toBe("*");
      expect(theirs.headers.get("access-control-allow-credentials")).toBeNull();

      const preflight = await SELF.fetch(`${BASE}/api/w/x`, { method: "OPTIONS", headers: { origin: "https://web.test" } });
      expect(preflight.status).toBe(204);
      expect(preflight.headers.get("access-control-allow-origin")).toBe("https://web.test");
      expect(preflight.headers.get("access-control-allow-headers")).toContain("authorization");
    });
  });
});
