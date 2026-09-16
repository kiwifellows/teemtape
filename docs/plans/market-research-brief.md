# Market Research Brief — teemtape Pro (paid tier)

> **For:** market researcher
> **From:** Ben Fellows (teemtape)
> **Date:** 2026-09-17
> **Decision deadline:** we want findings back before committing engineering
> time. Please flag anything that would change the plan early rather than
> waiting for the full report.
>
> Companion doc (engineering plan, for context only — you don't need to read
> the code): [`paid-tier-plan.md`](paid-tier-plan.md).

---

## 1. The product today (what you're researching a paid tier for)

**teemtape** ([teemtape.com](https://teemtape.com), source on
[GitHub](https://github.com/kiwifellows/teemtape)) is a free, open-source
"ticker app for commenting on stocks":

- You get a **watchlist** at a URL like `teemtape.com/w/<token>`. The URL is
  the only credential — **no sign-up, no email, no password.** Anyone with
  the link can see the list, add symbols, and leave **anonymous notes** next
  to any stock.
- Quotes are **delayed ~1 minute**, informational only. It is explicitly
  **not** a trading app — no orders, no portfolio, no money.
- People pick a lightweight **handle** (e.g. `user1234`) so collaborators on
  a shared list can tell each other apart.
- There is a **CLI** (`npm i -g @teemtape/cli`) and an
  **AI-agent skill**, so AI agents (Claude, etc.) can read a watchlist and
  post notes alongside humans. Agent notes are badged in the UI. This
  "humans and agents annotating the same watchlist" is the distinctive angle.
- The project doubles as a public teaching example of building software
  incrementally with agentic AI, which is where its current audience comes
  from (developers, indie hackers, AI-tooling people) — **not** primarily
  retail traders yet.

Current usage numbers: early / small. Assume we are pre-product-market-fit
and the paid tier is partly a way to find out who values this.

## 2. The proposed paid tier

Hosted only (self-hosters of the open-source code get everything free — that
stays true). Watchlists stay at **teemtape.com**; everything paid lives in a
separate **dashboard at `dashboard.teemtape.com`** (accounts, billing,
managing lists and who can access them), built from a private codebase. The
open-source app is unchanged except that it will honour the permissions set
in the dashboard.

| Plan | Price | Includes |
| --- | --- | --- |
| Free | $0 | Everything above, unchanged. |
| **Monthly** | **$10 / mo** | Account; **multiple saved watchlists**; **permissions** per watchlist (owner / editor / commenter / viewer; public-edit / comment-only / view-only / private links); invite collaborators by email or handle (collaborators don't need to pay). |
| **Annual** | **$100 / yr** | Same as Monthly (~2 months free). |
| **Founder** | **$1,000 one-time, lifetime** | Everything in Pro forever + a **public sponsor listing on GitHub** (name/avatar in the project's README & SPONSORS file, Founder badge in-app) + membership of an **exclusive trader club**. |

Checkout is Stripe. Prices in USD.

Two things about the Founder tier are **not yet defined** and we want your
input, not just validation:

1. **"Sponsor badge on GitHub."** GitHub's own profile sponsor badge only
   appears if the money goes through *GitHub Sponsors*. If we sell through
   Stripe, what we can offer is a listing in the repo (README / SPONSORS.md
   "Founders" wall with link to their profile). Does the audience care about
   the difference?
2. **"Exclusive trader club."** Currently a placeholder. Candidates: a
   private GitHub Discussions space; a Discord; a founders-only shared
   watchlist inside the app where founders + the maintainer annotate stocks
   together; periodic calls. We need to know what "club" this audience would
   actually pay to be in, and what they'd expect the host to do.

## 3. Hypotheses to test

Please tell us which of these hold, and how confidently.

- **H1** There is a segment that will pay ~$10/mo for **private / permissioned
  shared watchlists with notes** (small groups of friends, investing clubs,
  newsletter authors sharing with subscribers, teams).
- **H2** The **AI-agent angle** (agents reading and annotating your watchlist
  via CLI/skill, private lists accessible to your agent with a token) is a
  stronger reason to pay than the collaboration features, for at least the
  developer/AI-tooling segment.
- **H3** A **$1,000 lifetime "Founder" tier** can sell a meaningful number of
  units (define "meaningful": we'd consider 20–50 units in the first 90 days
  a success) to an audience of early adopters / supporters of open source,
  if the community component is credible.
- **H4** Buyers of a Founder tier value the **public recognition** (GitHub
  listing, badge) roughly as much as the lifetime access.
- **H5** The existing free product is a sufficient funnel — i.e. people who
  use anonymous lists will convert to accounts — versus needing a separate
  acquisition channel for the paid tier.
- **H6** Annual at $100 (17% discount) is the right gap; a bigger discount
  (e.g. $96 / 20%) would not materially move annual share.

## 4. Questions we need answered

### 4.1 Market & segments
1. Who actually pays for watchlist / stock-notes / social-investing tools
   today? Segment by: retail traders, investing clubs, finance creators &
   newsletter writers, developers/quants, small advisory teams.
2. For each segment: size (rough), where they hang out, what they currently
   use, what they pay.
3. Which segment is the **best first target** for teemtape Pro given its
   current developer/AI audience, and why?

### 4.2 Competitive landscape & pricing benchmarks
Please build a comparison table (product, target user, free tier, paid
price(s), collaboration features, community features, API/agent access,
notable strengths/weaknesses). Include at least:

- TradingView (watchlists, ideas, Premium tiers)
- Stocktwits (free + Edge/premium)
- Yahoo Finance Plus / Premium
- Seeking Alpha Premium
- Finviz Elite
- Koyfin
- Simply Wall St
- Commonstock (now shut down — *why* matters)
- Discord / Telegram paid trading communities (typical price points, churn,
  what "club" means there)
- Substack finance newsletters with paid community tiers
- Any tool offering **LLM/agent access** to watchlists or portfolios (e.g.
  MCP servers, ChatGPT plugins, Perplexity Finance) — this is the emerging
  space we care most about.

Then: where do **$10/mo, $100/yr, $1,000 lifetime** sit against these? Too
high, too low, about right, and for which segment?

### 4.3 Lifetime / founder / sponsorware models
4. What are comparable **lifetime-deal** or **founder-tier** outcomes for
   small SaaS and open-source projects? Look at: AppSumo-style LTDs (and
   their known downsides), "sponsorware" (e.g. Caleb Porzio's model), Basecamp
   *Once*, Obsidian Catalyst, Tailwind UI early access, Plausible/Ghost
   founder tiers, GitHub Sponsors one-time tiers on popular repos.
5. Typical unit counts and price points that worked; what perks were the
   real drivers (recognition, access to the maker, early features, lifetime
   price lock).
6. Is capping the tier (e.g. "first 100 founders") advisable? Evidence?
7. Should we **pre-sell** the Founder tier before the Pro features ship?
   What do buyers expect in that case?

### 4.4 The trader club
8. What do paying members of trading/investing communities actually get and
   value? (Signals? Discussion? Access to a respected host? Accountability?
   Education?) What makes them stay vs churn?
9. What platform do they expect (Discord, Slack, private forum, in-app)?
10. What are the reputational / regulatory pitfalls of hosting a "trader
    club" (pump-and-dump optics, advice vs education framing, moderation
    load)? Any jurisdiction-specific notes for **New Zealand** (where the
    business is) and the US (where most users are likely to be)?
11. Given teemtape is explicitly "not a trading app / not advice", is
    "trader club" even the right name? Suggest alternatives if not.

### 4.5 Willingness to pay & packaging
12. Which features belong in Free vs Pro to maximise conversion without
    killing the free funnel? Specifically: should a **signed-in free
    account** exist (e.g. 1 saved watchlist) or should accounts be Pro-only?
13. Is "collaborators don't pay" (only the list owner pays) the right seat
    model, or does it leave money on the table?
14. Any evidence on monthly vs annual mix at these price points for tools
    like this?
15. Would **agent/API access** as a distinct paid add-on (or as the Pro
    hook) resonate more than "multiple watchlists + permissions"?

### 4.6 Go-to-market
16. Realistic acquisition channels for the first 100 paying users given the
    current audience (GitHub, dev Twitter/X, Hacker News, AI-tooling
    communities) — and whether we need to reach retail-investing channels at
    all for v1.
17. What messaging / positioning would you recommend? Give 2–3 candidate
    one-liners.
18. Naming: "teemtape Pro" vs alternatives.

## 5. What we'd like back

1. **Executive summary (1 page):** GO / NO-GO / GO-WITH-CHANGES, with the
   top 5 findings and the recommended pricing & packaging.
2. **Findings against each hypothesis H1–H6** (hold / doesn't hold / unclear,
   with evidence).
3. **Competitor & pricing table** (§4.2).
4. **Recommendations on the open decisions** below — these map directly to
   decisions in the engineering plan:

   | ID | Decision needed |
   | --- | --- |
   | D1 | Founder via Stripe + repo listing, or via GitHub Sponsors for the native badge? |
   | D2 | What the trader club concretely is, on what platform, run how. |
   | D4 | Free signed-in tier (1 saved list) — yes or no? |
   | D5 | Final price points; annual discount; founder cap. |
   | D6 | Pre-sell Founder before features ship — yes or no? |
   | D7 | Name. |
5. **Sources / evidence appendix.**

Format: Markdown preferred (it goes straight into the repo's `docs/plans/`
folder); a spreadsheet for the comparison table is fine too.

## 6. Constraints & context for your analysis

- Solo maintainer, agent-assisted development; engineering capacity is
  roughly 8–10 weeks for the whole paid tier. Recommendations that need a
  team of ten are not useful.
- Everything runs on Cloudflare (Workers, D1). Stripe for payments. Not
  looking to change stack.
- The open-source project must stay fully usable and free to self-host —
  we won't close-source features to sell them ("open core" is fine,
  "bait-and-switch" is not). Paid features are a separate private service
  layered on top, not gated code in the public repo.
- Two front doors: `teemtape.com` (free, anonymous, unchanged) and
  `dashboard.teemtape.com` (paid). Positioning advice should account for
  that — e.g. is "dashboard" the right word for what people are buying?
- Brand voice is plain, slightly irreverent, developer-friendly. Not a
  fintech-corporate look.
- No real-time data, no trading, no advice. Don't recommend features that
  cross those lines.

## 7. Timeline

- Brief issued: 2026-09-17
- Early flags / quick sanity check on pricing: **within 1 week**
- Full findings: **within 3 weeks**
- Working session to walk through recommendations: to schedule after
  delivery.

Questions while you work: reply on the brief, or open a GitHub Discussion on
the repo.
