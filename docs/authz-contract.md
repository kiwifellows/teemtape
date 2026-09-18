# Authorisation hook contract (`AUTHZ`) — v1

The teemtape API is anonymous by design: a watchlist's URL token is its only
credential and anyone holding it can read, add symbols, and post notes. The
hosted service at teemtape.com layers accounts and permissions on top of that
**without changing this repository's data model**, through one optional
Cloudflare [service binding](https://developers.cloudflare.com/workers/runtime-apis/bindings/service-bindings/)
named `AUTHZ`.

This document is the contract between the public API Worker
([`workers/api/src/authz.ts`](../workers/api/src/authz.ts)) and whatever
implements the binding. It is MIT-licensed like the rest of the repo: anyone
self-hosting teemtape can write their own authoriser against it.

**When the binding is absent, nothing here applies** — every list is
`public-edit`, exactly the behaviour documented in
[`architecture.md`](architecture.md).

## Request

The public API `POST`s one JSON body per authorisable request to the bound
service (URL path `/authz`; the host is irrelevant for a service binding):

```ts
interface AuthzRequest {
  v: 1;
  action: 'view' | 'add_symbol' | 'post_note' | 'manage'   // on a watchlist
        | 'created'                                          // event: a list was just created
        | 'identify';                                        // who is the caller? (no token)
  token?: string;                                            // 32-hex watchlist token
  credential?:
    | { type: 'bearer'; value: string }                      // Authorization: Bearer <pat>
    | { type: 'cookie'; value: string };                     // the raw Cookie header, opaque
}
```

Which public endpoints send which action:

| Endpoint | Action |
| --- | --- |
| `GET /api/w/:token` | `view` |
| `GET /api/w/:token/agent` | `view` |
| `GET /api/w/:token/notes` | `view` |
| `POST /api/w/:token/symbols` | `add_symbol` |
| `POST /api/w/:token/notes` | `post_note` |
| `POST /api/watchlists` (after creating, only if a credential is present) | `created` — fire-and-forget |
| `GET /api/whoami` | `identify` |

`manage` is reserved for future settings endpoints; the public API does not
send it today.

The credential is taken from the `Authorization: Bearer …` header when
present (CLI, agents), otherwise the raw `Cookie` header (browser sessions
set by the Pro app on `.teemtape.com`). The public API never parses either;
the authoriser is responsible for validating them.

## Response

```ts
interface AuthzResponse {
  allow: boolean;
  role?: 'owner' | 'editor' | 'commenter' | 'viewer' | 'anonymous';
  link_access?: 'public-edit' | 'public-comment' | 'public-view' | 'private';
  user?: { handle: string };
  reason?: 'sign_in_required' | 'forbidden';   // when allow = false
  grants?: ('view' | 'add_symbol' | 'post_note' | 'manage')[];  // optional, see below
}
```

- `grants` (optional, additive in v1) lists **every** list action this
  caller may perform on this list — the union of what their role and the
  link grant. The public API passes it through on `GET /api/w/:token` as
  `access.can` so the web app can grey out "Add symbol" or the note box up
  front and say why, instead of discovering 401/403s one action at a time.
  When absent, the public API derives it from `link_access` alone (the
  anonymous view of the list).

- `link_access` is what the bare share link grants to non-members. It is
  cached by the public API for 60 s per token (see below), so return it on
  every list decision. Lists the authoriser doesn't know about should be
  reported as `public-edit`.
- `reason` drives the HTTP status the public API returns: `sign_in_required`
  → **401**, `forbidden` → **403**. If omitted, the public API uses 401 for
  callers with no credential and 403 otherwise.
- For `identify`, only `allow` and `user` matter; `user` absent → anonymous.
- For `created`, the response is ignored.

A non-2xx status, a malformed body, or a timeout (`AUTHZ_TIMEOUT_MS`, default
250 ms) is treated as a service failure — see resilience.

## What the public API does with the answer

```
no AUTHZ binding                       → allow (today's behaviour)

anonymous caller + cached link_access
  that grants the action               → allow, no call made

call AUTHZ
  allow = true                         → proceed; cache link_access
  allow = false                        → 401 / 403, JSON body:
                                          { error, reason, signInUrl? }
  failure (error / timeout)            → allow if the list is not cached as
                                          restricted; otherwise 503 + Retry-After: 5
```

`signInUrl` is the public API's `DASHBOARD_URL` var, when set. Clients use
it to tell people where to sign in (`teemtape login`, the web app's private
panel).

### Denial body

```json
{ "error": "this watchlist is private — sign in to continue",
  "reason": "sign_in_required",
  "signInUrl": "https://app.teemtape.com" }
```

`@teemtape/api-client` exposes these as `ApiError.accessDenied`,
`ApiError.reason`, and `ApiError.signInUrl`.

## Role → action matrix (the authoriser's job)

The public API does not interpret roles; it only enforces `allow`. The
reference semantics used by the hosted service:

| | `view` | `add_symbol` | `post_note` | `manage` |
| --- | :-: | :-: | :-: | :-: |
| `owner` | ✅ | ✅ | ✅ | ✅ |
| `editor` | ✅ | ✅ | ✅ | ❌ |
| `commenter` | ✅ | ❌ | ✅ | ❌ |
| `viewer` | ✅ | ❌ | ❌ | ❌ |
| non-member, link `public-edit` | ✅ | ✅ | ✅ | ❌ |
| non-member, link `public-comment` | ✅ | ❌ | ✅ | ❌ |
| non-member, link `public-view` | ✅ | ❌ | ❌ | ❌ |
| non-member, link `private` | ❌ | ❌ | ❌ | ❌ |

## Caching

The public API caches `link_access` per token in KV under `authz:v1:<token>`
for 60 s. Consequences the authoriser should know about:

- Loosening or tightening a list's link access can take up to 60 s to affect
  anonymous callers. Callers with a credential always trigger a call.
- The cache is also what decides fail-open vs fail-closed when the service is
  down: a list last seen as anything other than `public-edit` fails closed.

## Configuration (public API)

```toml
# workers/api/wrangler.toml
[vars]
DASHBOARD_URL   = "https://app.teemtape.com"      # returned as signInUrl
CORS_ORIGINS    = "https://teemtape.com,https://www.teemtape.com"  # cookie-bearing origins
AUTHZ_TIMEOUT_MS = "250"                           # optional

[[services]]
binding = "AUTHZ"
service = "teemtape-pro"        # the private Worker (github.com/kiwifellows/teemtape-pro)
entrypoint = "Authz"            # a named entrypoint: reachable only via this binding, never over HTTP
```

`CORS_ORIGINS` matters because browsers refuse to send cookies to a `*`
origin: listed origins get an exact echo plus
`access-control-allow-credentials: true`; everyone else keeps `*`.

## Versioning

`v` is sent on every request. An authoriser must accept the versions it
knows and may ignore unknown fields. Breaking changes bump `v`; the public
API will only ever send one version per release, documented here.

## Testing without a real authoriser

- **Worker tests**: [`workers/api/test/authz-stub.ts`](../workers/api/test/authz-stub.ts)
  is an in-process implementation of this contract, bound as `AUTHZ` in
  `vitest.config.ts`, with control endpoints to make a list private, add
  members, or simulate failure.
- **Clients**: the mock server (`npm run mock`) accepts
  `MOCK_PRIVATE_TOKENS=<token,…>`, `MOCK_ACCESS_TOKEN` (default `mock-pat`)
  and `MOCK_SIGN_IN_URL`, and then answers 401/403/`whoami` the way the
  hosted API would.
