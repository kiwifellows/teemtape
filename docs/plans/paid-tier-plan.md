# teemtape Pro — Plan & Roadmap

> Status: **APPROVED FOR BUILD (P1).** Market research is in
> ([`docs/market-research/`](../market-research/)) with a
> **GO-WITH-CHANGES** verdict; the changes are folded into this document and
> the open decisions in §9 are now recorded. Nothing is built yet — P1 is the
> first engineering slice.
>
> Written 2026-09-17 against the codebase as of `main` (v0.1.4 + Worker-assets
> docs fix). Companion: [`market-research-brief.md`](market-research-brief.md)
> (the brief that produced the research).

---

## 0. What the research changed (read this first)

Full findings: [`teemtape-pro-market-research.md`](../market-research/teemtape-pro-market-research.md),
one-pager: [`early-flags.md`](../market-research/early-flags.md).

| Original plan | Research says | Now |
| --- | --- | --- |
| Sell "multiple watchlists + permissions" | Free URL already covers solo use; **agent/CLI access is the hook** for this ICP, permissions are the trust layer agents need | Market **agent-first**; ship permissions + scoped tokens as what makes agents safe to let in |
| Accounts maybe Pro-only | Pro-only accounts choke the funnel and agents | **Free signed-in account = 1 saved list**; Pro = unlimited lists + roles + agent tokens / higher limits |
| Founder $1,000 with trader club in v1 | Undefined "trader club" is radioactive (advice optics, signal-room churn); Founder without a warm audience forecasts single digits | **Founder & club out of v1.** Waitlist only. Revisit as "Founders' Circle" (AMAs, agent recipes, *no picks*) after 20+ paying Pros, cap 50, written scope + fair-use + refund policy |
| GitHub native sponsor badge | Devs care about visible credit, not which processor minted it | **Stripe** for everything; README lists Founders when they exist; optional GitHub Sponsors for tips |
| Organic free→paid | Free is activation, not a funnel | **GTM is in the plan** (P7): Show HN, agent demo clip, skill directory listing |
| "Dashboard" | Fine but generic; lead with "teemtape Pro" | Host is **`app.teemtape.com`**; tier is **teemtape Pro** |
| ~8–10 weeks | That budget is *already* accounts + ACL + invites + billing | v1 scope trimmed to exactly that; no seats, no real-time, no club |

## 1. What we're building (one paragraph)

teemtape today is a free, open-source, **anonymous** ticker app: a watchlist
lives at `teemtape.com/w/<token>`, the URL is the credential, anyone with the
link can add symbols and notes, and agents drive it through the CLI.
**teemtape Pro** adds accounts to the hosted service so people can sign in,
keep **multiple named watchlists**, control **who (and which agent) can view /
comment / edit** each one, and issue **scoped tokens** to their agents. It is
sold through Stripe Checkout monthly or annually. **Watchlists stay at
`teemtape.com`.** Everything paid lives at **`app.teemtape.com`**, built from
a **separate private repo**. The open-source product does not change; it
gains one small, generic hook so the private service can enforce permissions
on it.

## 2. Pricing (v1)

| Plan | Price | Stripe mode | What you get |
| --- | --- | --- | --- |
| **Free (anonymous)** | $0 | — | Today's product, unchanged. |
| **Free (signed-in)** | $0 | — | Account + **1 saved watchlist** + 1 agent token. Enough to try the workflow, not enough to run on. |
| **Pro Monthly** | **$10 / month** | `subscription` | Unlimited saved watchlists, roles & invites, private/comment-only/view-only links, multiple agent tokens, higher agent rate limits. |
| **Pro Annual** | **$100 / year** | `subscription` (yearly) | Same; ~2 months free. **Highlighted at checkout.** |
| **Founder** | $1,000 one-time | `payment` | **Not in v1.** Waitlist only. See §3.6. |

USD; Stripe Tax handles the rest. Collaborators of a Pro owner **do not pay**
(owner-pays model, revisit if teams show up).

**Fair use is part of the price** (research flag: lifetime/annual × unbounded
agent calls is a margin bomb): per-plan agent rate limits are enforced from
day one and stated in the ToS.

## 3. Feature scope

### 3.1 Accounts (`app.teemtape.com`)
- Sign in with **email magic link / OTP** and **GitHub OAuth**. No passwords.
- Session cookie on **`.teemtape.com`** so `teemtape.com`, `app.teemtape.com`
  and `api.teemtape.com` all see it.
- **Claim an anonymous watchlist**: attach any `/w/<token>` list you hold to
  your account. Nobody loses anything.
- Profile = handle (claimed through the public `POST /api/handles`, same
  namespace as anonymous handles) + email + optional GitHub login.

### 3.2 Watchlists (management layer)
- Named lists with description, listed under "My watchlists". Each is an
  ordinary `teemtape.com/w/<token>` list underneath — the app manages, it
  doesn't replace.
- Free signed-in: 1 saved list. Pro: unlimited. Limits are config values.
- Creating a list on `teemtape.com` while signed in saves it to your account
  automatically (the public API emits a `created` event to the hook, §4.3).

### 3.3 Permissions & sharing (the trust layer)

| Role | View | Add symbols | Post notes | Manage |
| --- | :-: | :-: | :-: | :-: |
| `owner` | ✅ | ✅ | ✅ | ✅ |
| `editor` | ✅ | ✅ | ✅ | ❌ |
| `commenter` | ✅ | ❌ | ✅ | ❌ |
| `viewer` | ✅ | ❌ | ❌ | ❌ |

Plus a **link access** level per list for non-members holding the bare URL:
`public-edit` (today's behaviour, the default everywhere) · `public-comment`
· `public-view` · `private`.

Members invited by **email** or **handle**; invites are one-time tokens;
accepting needs an account (any tier). Settings live in the app;
**enforcement happens in the public API** via the hook, so `teemtape.com`,
the CLI and the agent endpoints all honour it.

### 3.4 Agent tokens (the marketed feature)
- Personal access tokens (PATs), created in the app, **scoped**: to specific
  lists or all, and to a role (`viewer` / `commenter` / `editor`). An agent
  token that can only *comment* on *one* list is the thing that makes people
  comfortable letting an agent in.
- Sent as `Authorization: Bearer <pat>` to the public API and the agent
  endpoints (`/ai/watchlist/:token`, `/w/:token.md`).
- Per-plan rate limits keyed on the token.
- CLI: `teemtape login` (v1: paste a PAT; device-code flow later),
  `teemtape watchlists`, `teemtape use <name|token>`.

### 3.5 Billing
- **Stripe Checkout** (hosted) for Monthly/Annual; **Customer Portal** for
  changes/cancel/invoices. Entitlements come only from verified,
  de-duplicated **webhooks** into a `subscription` table.
- `past_due` grace window, then downgrade: extra lists become read-only,
  extra agent tokens are disabled, nothing is deleted.

### 3.6 Founder tier & Founders' Circle — **deferred**
Not built or sold in v1. What we do in v1: a **waitlist** ("Founders'
Circle — notify me") on the pricing page, and we count it. Trigger to
revisit: **20+ paying Pros**. If/when sold: $1,000 one-time via Stripe, cap
50 with a public counter, written scope (lifetime Pro = the defined v1
feature set + fair use), README/SPONSORS listing, a circle with roadmap AMAs
and agent recipes — **no stock picks, not a "trader club"** — and a refund
policy. Get counsel on NZ FAP / US adviser optics before any community that
discusses tickers.

### 3.7 Out of scope for v1
Teams/seats, SSO, real-time quotes, alerts, portfolios, order entry, native
mobile, metered API pricing, any community feature, badges.

## 4. Architecture — two repos, one product

### 4.1 Repo split

| | `kiwifellows/teemtape` (**public**, MIT) | `kiwifellows/teemtape-pro` (**private**) |
| --- | --- | --- |
| Hosts | `teemtape.com`, `api.teemtape.com`, `docs.teemtape.com` | `app.teemtape.com` (web + pro API under `/api`) |
| Owns | watchlists, symbols, notes, handles, quotes, CLI, api-client, docs | users, sessions, PATs, subscriptions/Stripe, list names + ownership, members/invites/link-access, waitlist |
| Data | `teemtape-db` (D1) — **schema unchanged** | `teemtape-pro-db` (D1) — new |
| Knows about the other? | optional `AUTHZ` service binding + `DASHBOARD_URL` var | depends on `@teemtape/api-client` (npm); calls `api.teemtape.com` as a client |
| Deploys via | existing GH Actions | its own GH Actions |

Self-hosters deploy the public repo alone: no binding → every list is
`public-edit`, exactly today's product.

```
                     teemtape.com/w/<token>            app.teemtape.com
                     (public web, unchanged)           (private: web + pro API)
                               │                                │
                               ▼                                ▼
 CLI / agents ───▶  api.teemtape.com                  pro API Worker  ◀──── Stripe webhooks
 (PAT or none)      public API Worker  ── AUTHZ ────▶ (private repo)  ────▶ Email (magic links, invites)
                    teemtape-db (D1)   service        teemtape-pro-db (D1)
                                       binding
```

### 4.2 Why this split
Open core without bait-and-switch (public repo stays complete); the seam is
a **contract**, not shared code; billing bugs can't take down anonymous
lists; no fork drift.

### 4.3 The hook: `AUTHZ` service binding

Cloudflare service bindings let one Worker call another with no public URL
and ~zero latency. The public API gets an optional binding:

```toml
# workers/api/wrangler.toml — hosted production only; absent for self-hosters
[[env.production.services]]
binding = "AUTHZ"
service = "teemtape-pro-api"
```

Contract (`docs/authz-contract.md` in the public repo, MIT, versioned):

```ts
interface AuthzRequest {
  v: 1;
  action: 'view' | 'add_symbol' | 'post_note' | 'manage'   // on a list
        | 'created'                                          // event: list was just created
        | 'identify';                                        // who is this caller? (no token)
  token?: string;                                            // watchlist token
  credential?: { type: 'bearer'; value: string }             // PAT (CLI/agents)
             | { type: 'cookie'; value: string };            // raw Cookie header (browser), opaque
}
interface AuthzResponse {
  allow: boolean;
  role?: 'owner' | 'editor' | 'commenter' | 'viewer' | 'anonymous';
  link_access?: 'public-edit' | 'public-comment' | 'public-view' | 'private';
  user?: { handle: string };
  reason?: 'sign_in_required' | 'forbidden';
}
```

Public API behaviour:

```
no AUTHZ binding                     → allow (today's behaviour)
AUTHZ error / timeout (~50 ms)       → allow if list not known-restricted
                                       (KV-cached link_access, default public-edit),
                                       otherwise 503
allow = false                        → 401 (sign_in_required) / 403 (forbidden)
                                       body: { error, reason, signInUrl: DASHBOARD_URL }
```

The pro API answers from its own D1 (`watchlist_meta` + `watchlist_member`
keyed by token) — no cross-DB join. Unknown token → `public-edit`.

### 4.4 Private repo (`teemtape-pro`)

```
teemtape-pro/
├── apps/app/              # React (Vite) — app.teemtape.com UI
├── workers/pro-api/       # auth, Stripe, lists/members/invites, PATs, /authz handler, waitlist
├── packages/pro-client/   # typed client for the pro API (app + CLI)
└── .github/workflows/
```

**Auth:** Better Auth (OSS, Workers + D1 adapter, magic link / OTP / GitHub,
Stripe plugin). **Stripe:** `stripe` npm with fetch client +
`SubtleCryptoProvider` for webhook verification. **Email:** Cloudflare
Email Service or Resend.

Data model (`teemtape-pro-db`):

```sql
CREATE TABLE user (
  id TEXT PRIMARY KEY, email TEXT UNIQUE, email_verified INTEGER NOT NULL DEFAULT 0,
  handle TEXT UNIQUE, github_login TEXT UNIQUE, github_id INTEGER UNIQUE, created_at TEXT NOT NULL
);
-- (+ Better Auth session/account/verification tables)

CREATE TABLE api_token (
  id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE, name TEXT NOT NULL,
  scope_role TEXT NOT NULL CHECK (scope_role IN ('viewer','commenter','editor')),
  scope_tokens TEXT,                       -- JSON array of watchlist tokens, NULL = all mine
  last_used_at TEXT, created_at TEXT NOT NULL
);

CREATE TABLE watchlist_meta (              -- one row per managed public list
  token TEXT PRIMARY KEY, owner_user_id TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE,
  name TEXT NOT NULL, description TEXT,
  link_access TEXT NOT NULL DEFAULT 'public-edit'
    CHECK (link_access IN ('public-edit','public-comment','public-view','private')),
  created_at TEXT NOT NULL
);
CREATE INDEX idx_meta_owner ON watchlist_meta(owner_user_id);

CREATE TABLE watchlist_member (
  token TEXT NOT NULL REFERENCES watchlist_meta(token) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('owner','editor','commenter','viewer')),
  added_at TEXT NOT NULL, PRIMARY KEY (token, user_id)
);

CREATE TABLE watchlist_invite (
  id TEXT PRIMARY KEY, token TEXT NOT NULL REFERENCES watchlist_meta(token) ON DELETE CASCADE,
  email TEXT, handle TEXT, role TEXT NOT NULL, invite_token TEXT NOT NULL UNIQUE,
  invited_by TEXT NOT NULL REFERENCES user(id), expires_at TEXT NOT NULL, accepted_at TEXT
);

CREATE TABLE subscription (
  user_id TEXT PRIMARY KEY REFERENCES user(id) ON DELETE CASCADE,
  stripe_customer_id TEXT UNIQUE, stripe_subscription_id TEXT UNIQUE,
  plan TEXT NOT NULL CHECK (plan IN ('free','monthly','annual')),
  status TEXT NOT NULL, current_period_end TEXT, updated_at TEXT NOT NULL
);

CREATE TABLE stripe_event (id TEXT PRIMARY KEY, type TEXT NOT NULL, received_at TEXT NOT NULL);

CREATE TABLE waitlist (id TEXT PRIMARY KEY, email TEXT NOT NULL UNIQUE, kind TEXT NOT NULL, created_at TEXT NOT NULL);
```

Pro API surface:

```
/auth/*                                  (auth library)
GET  /me                                 profile + plan + limits
GET/POST/DELETE /me/tokens               scoped PATs
GET  /watchlists                         mine (owner or member)
POST /watchlists                         create (calls public POST /api/watchlists, inserts meta)
POST /watchlists/:token/claim
PATCH /watchlists/:token                 name / description / link_access
GET/POST/DELETE /watchlists/:token/members
POST /watchlists/:token/invites          · POST /invites/:invite_token/accept
POST /billing/checkout {price}           · POST /billing/portal   · POST /billing/webhook
POST /waitlist {email, kind}
POST /authz                              service binding only — not on a public route
```

### 4.5 Build & deploy integration

| Concern | Mechanism |
| --- | --- |
| Shared types/client | Public repo publishes `@teemtape/api-client`, `@teemtape/cli`, `@teemtape/mock-server` on release; private repo pins them. |
| Contract drift | Private CI tests against the published mock server and a `wrangler dev` of the public API at the pinned version. |
| Public released → re-test private | `repository_dispatch` (`teemtape-released`, `{version}`) from public `release.yml`; private workflow bumps the pin, tests, opens a PR. |
| Contract versioning | `AuthzRequest.v`; pro API must accept older versions. |
| Deploy ordering | Independent — public API tolerates the binding absent or the pro Worker down. |
| Environments | Both repos get `staging` (`api-staging.teemtape.com`, `app-staging.teemtape.com`). |
| Secrets | Each repo holds only its own. |

### 4.6 Sessions across hosts
Cookie `Domain=.teemtape.com; Secure; HttpOnly; SameSite=Lax`, set by the
app. `teemtape.com` calls `api.teemtape.com` with `credentials: 'include'`;
the public API forwards the cookie to `AUTHZ` opaque. Public API CORS must
echo the exact origin + `access-control-allow-credentials: true` for
`teemtape.com` origins.

### 4.7 Security
PATs hashed, shown once, scoped, revocable. Webhooks signature-verified and
de-duplicated. `/authz` unreachable except via the binding. Per-token rate
limits on the public API keyed on the PAT (in addition to the IP limiter).
PII (email) exists only in the private DB; deletion cascades.

## 5. Roadmap

Sizes: S ≈ 1–2 days of agentic build + review, M ≈ a week, L ≈ 2+ weeks.

| # | Milestone | Repo | Size | Ships |
| - | --- | --- | :-: | --- |
| **P0** | Research & decisions ✅ · create private repo skeleton · staging envs · DNS for `app.teemtape.com` | both | S | Empty private repo deploying "hello" to `app.teemtape.com` |
| **P1** | **Hook + contract in the public repo** — full spec in §5.1. Ships with the binding **unbound** in prod. | public | M | Public product unchanged in behaviour; ready to be governed |
| **P2** | **Accounts** — pro API with auth library, `.teemtape.com` session, `/me`, `/authz` handler (allow-all with identity), claim-a-watchlist, free 1-list limit. App: login, account, my watchlists. Bind `AUTHZ` in prod. | private | M | Sign in; see your lists; create/claim; no paywall yet |
| **P3** | **Billing** — Stripe products/prices, Checkout + Portal, webhooks → `subscription`, limits enforced, `/pricing` (annual highlighted) + Founders' Circle waitlist. | private | M | Money in |
| **P4** | **Permissions + agent tokens** — roles, invites, link-access in the app; `/authz` returns real roles; scoped PATs + per-token rate limits; CLI `login` / `watchlists` / `use` wired to the pro API. | private (+ CLI PR) | L | The Pro feature set; agents work with private lists |
| **P5** | **Launch readiness** — ToS/privacy (fair-use clause), Stripe Tax, deletion/export, email templates, funnel analytics, docs site "Pro" section, landing copy on `teemtape.com` (agent-first). | both | M | Public launch |
| **P6** | **GTM** — Show HN + README rewrite ("OSS ticker tape humans and agents comment on — Pro adds roles + agent tokens"), 30-second agent demo clip, skill-directory listing, dev-X thread. | — | S | First 100 payers campaign |
| **P7** | *Founder / Founders' Circle* — only after 20+ paying Pros (§3.6). | private | M | — |

Order: **P0 → P1 → P2 → P3 → P4 → P5 → P6.** Roughly **9–11 weeks** to P6;
P4 is the long pole.

### 5.1 P1 spec — public-repo changes (the next build)

Principle: the public API gains one question — *may this caller do this
action on this list?* — answered by an optional service binding. Nothing in
this repo learns about users, plans, or Stripe.

**`workers/api`**
- `src/env.ts` — add `AUTHZ?: Fetcher`, `DASHBOARD_URL?: string`.
- **new `src/authz.ts`** — `authorize(request, env, token, action)`:
  builds `AuthzRequest` from `Authorization: Bearer` or the raw `Cookie`
  header; calls `env.AUTHZ.fetch()` with ~50 ms timeout; KV-caches
  `link_access` per token for 60 s (`authz:v1:{token}`); **no binding →
  allow**; binding error → allow unless known-restricted (then 503); deny →
  `HttpError` 401/403 with `{ error, reason, signInUrl }`.
- `src/index.ts` — one `authorize()` call per branch in the `/api/w/:token`
  block (`GET`, `/agent`, `GET /notes` → `view`; `POST /symbols` →
  `add_symbol`; `POST /notes` → `post_note`). After `POST /api/watchlists`
  with a credential present: `ctx.waitUntil(authz 'created')`. New
  `GET /api/whoami` → AUTHZ `identify` → `{ user: { handle } | null }`.
- `src/http.ts` — CORS: echo exact origin + `allow-credentials: true` for
  configured origins; add `authorization` to allowed headers; `error()` can
  carry extra JSON fields.
- `wrangler.toml` — `DASHBOARD_URL` var; commented `[[env.production.services]]`
  block for `AUTHZ`.
- `test/authz.spec.ts` — stub `AUTHZ` fetcher: allow / deny 401 / deny 403 /
  timeout fail-open / timeout fail-closed / cache hit. Existing `api.spec.ts`
  unchanged (proves fail-open).

**`packages/api-client`**
- `ApiClientOptions.accessToken?` (Bearer) and `credentials?`; `whoami()`;
  `AccessDeniedBody` type; `ApiError.signInUrl` getter.

**`packages/cli`**
- config: `accessToken` (`TEEMTAPE_ACCESS_TOKEN` / file, masked in
  `teemtape config`), `dashboardUrl`.
- `teemtape login` — prints `<dashboardUrl>/tokens`, accepts a pasted PAT,
  saves it. (Device-code flow is P4.)
- 401/403 → *"This watchlist is private — run `teemtape login` (sign in at
  …)"*.

**`apps/web`**
- `ApiContext` — `credentials: "include"` when `VITE_DASHBOARD_URL` set.
- `WatchlistPage` — 401/403 → "This watchlist is private" panel with sign-in
  link.
- `TopBar` — "Sign in" / "*handle* · Open app" from `/api/whoami`, only when
  `VITE_DASHBOARD_URL` set.
- Pages functions (`functions/ai/watchlist/[token].js`, `functions/w/*`) —
  forward `Authorization` / `Cookie` upstream; pass 401/403 through.

**Supporting**
- `packages/mock-server` — `MOCK_PRIVATE_TOKENS` env returns 401 for listed
  tokens (local testing of the denied path without the private repo).
- **`docs/authz-contract.md`** — the contract above, versioned.
- `skills/teemtape-cli/SKILL.md` + docs site — `TEEMTAPE_ACCESS_TOKEN`, `login`.
- `docs/architecture.md` — add the hook section.
- `.github/workflows/release.yml` — `repository_dispatch` to the private
  repo (added once it exists).

**Not touched:** D1 schema, `repo.ts`, note/author model, `X-Api-Key`, IP
rate limiter. No badges, no Stripe, no users, no email — ever, in this repo.

**Definition of done:** all existing tests pass unchanged; new authz tests
pass; deployed to prod with the binding absent and no behavioural change
observable; contract doc published.

## 6. Success metrics (90 days after launch)

From the research's checklist plus funnel numbers:

- [ ] ≥1 free → signed-in conversion path live (private-list panel, "Open app" link, `teemtape login`)
- [ ] Pro checkout ($10/$100) live before any Founder sale
- [ ] Public agent demo published
- [ ] Zero marketing copy implying signals or personalised advice
- Free → signed-in conversion; signed-in → Pro conversion; annual share
- Agent tokens created per Pro user; invites sent per Pro user
- Month-2/3 churn on Monthly
- Founders' Circle waitlist size (decides P7)

## 7. Risks

| Risk | Mitigation |
| --- | --- |
| Freemium trap: anonymous URL stays "good enough" | Free signed-in is 1 list; Pro sells multi-list + roles + agent tokens; market the agent workflow, not "private list" |
| Agent abuse on flat-rate plans | Per-token rate limits from day one; fair-use in ToS; measure agent call volume in private beta |
| Breaking the anonymous free flow | Hook optional and fail-open for public lists; contract tests; P1 ships unbound |
| Hook latency | In-datacentre binding; 60 s KV cache of `link_access`; 50 ms timeout |
| Two repos drift | Versioned contract; `repository_dispatch` re-test; private CI pinned to published packages |
| Advice optics | No community in v1; "not advice" carried into Pro; counsel before any Founders' Circle |
| PII/compliance on a solo project | Stripe Tax + Portal; email only; PII confined to private DB; deletion cascades |

## 8. Legal / compliance (launch blockers, P5)

ToS + Privacy Policy (NZ Privacy Act 2020, GDPR-style rights) · **fair-use
and rate-limit clause** · "not investment advice / not a trading app"
carried into Pro · Stripe Tax · refund policy · public repo stays MIT,
private repo proprietary, `authz-contract.md` MIT.

## 9. Decisions (recorded 2026-09-17)

| ID | Decision | Outcome |
| --- | --- | --- |
| **D1** | Founder via Stripe vs GitHub Sponsors | **Stripe.** GitHub Sponsors optional for tips; README lists both when relevant. |
| **D2** | What the club is | **No club in v1.** Later "Founders' Circle": AMAs + agent recipes, no picks, after 20+ Pros. |
| **D3** | Auth library | **Better Auth** (research had no view; engineering default stands). |
| **D4** | Free signed-in tier | **Yes — 1 saved list + 1 agent token.** |
| **D5** | Prices / cap | **$10 / $100 keep.** Founder $1,000 deferred; if sold, cap 50, public counter. |
| **D6** | Pre-sell | **Waitlist only.** No hard-charging Founder without written scope + refund policy. |
| **D7** | Names | Tier **teemtape Pro**; host **`app.teemtape.com`**; never "trader club". |
| **D8** | What we market | **Agent/CLI access first**; permissions as the trust layer. |

## 10. Next

1. Merge this plan + the research (`docs/plans/`, `docs/market-research/`).
2. Build **P1** on a branch in this repo (§5.1).
3. In parallel: create `teemtape-pro`, DNS for `app.teemtape.com`, staging envs (P0 engineering half).
4. P2 when P1 is deployed.
