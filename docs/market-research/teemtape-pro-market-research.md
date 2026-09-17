# teemtape Pro — Market Research Findings
**Date:** 2026-09-17
**Disclaimer:** Research notes only — not financial, legal, or investment advice.

Synthesised from `early-flags.md`, `competitors.md`, and `founder-and-club.md`. Ready to drop into `docs/plans/`.

---

## 1. Executive summary (1 page)

### Verdict: **GO-WITH-CHANGES**

Build hosted Pro. Do **not** spend the full 8–10 weeks on a vague “trader club,” seat billing, or retail-trader feature parity. Ship the smallest Pro that lets **humans + agents** share a permissioned watchlist. Kill or rename the club until you have payers.

### Top 5 findings

1. **$10/mo and $100/yr sit in a plausible indie/dev pocket** — near Yahoo Finance Bronze (~$9.99/mo / ~$95.40/yr) and other lite tools — but only if Pro sells workflow lock-in (multi-list + roles + agent auth), not “private watchlist.” Free anonymous URL already covers solo use; that is the freemium trap.
2. **AI-agent angle beats collaboration for this ICP (H2 holds).** Finviz already markets Elite export for automated / AI-agent workflows; ChatGPT / Perplexity Pro ~$20/mo normalise agent spend. Sheets/Notion already cover human collab; agent-writable structured ticker state is rarer.
3. **$1000 Founder is patron / sponsorware, not SaaS tier math.** Obsidian Catalyst recognition is ~$25 one-time; Porzio sponsorware sold recurring $5–$N/mo with a warm audience; Tailwind UI one-time worked with a huge following. Default forecast without warm reach: **single digits**, not 20–50 in 90 days. Undefined “trader club” makes this SKU radioactive.
4. **Free product is necessary activation, not a sufficient paid funnel (H5 does not hold).** First 100 payers still need deliberate GitHub / X / HN / AI-community GTM. Stay on those channels; no retail acquisition required for v1.
5. **“Trader club” imports signal-room expectations and advice optics** (NZ FAP-shaped risk + US social-trading scrutiny — research notes only; get counsel). Prefer **Founders’ Circle / Tape Room** with roadmap AMAs and agent recipes — or ship Pro with **zero club** until 20+ paying Pros.

### Recommended pricing & packaging

| SKU | Recommendation |
| --- | --- |
| **Pro monthly** | **$10/mo** — keep |
| **Pro annual** | **$100/yr** (~17% off / ~2 months free) — keep; highlight annual at checkout |
| **Founder** | **$1000 optional**, cap **≤50**, sell only after private beta works *or* as refundable pre-order with written v1 scope + fair-use. Prefer waitlist first. |
| **Free signed-in** | **Yes — 1 saved list**; Pro = multi-list + roles + agent API keys / higher limits |
| **Collaborators** | **Owner pays; collaborators free** for v1 |
| **Hook** | **Market agent/CLI**; ship permissions as the trust layer agents require |
| **Club** | **Out of v1 eng** — rename away from “trader”; add circle after payers exist |
| **Billing** | **Stripe** for Pro + Founder entitlement; optional GitHub Sponsors for small tips |

### Blunt bottom line

**GO** on Pro workflow monetization (accounts, ACL, invites, billing, agent keys). **CHANGE** Founder/club packaging and cut community from the eng slice. **DON’T** expand into retail-trader SaaS, real-time data, or seat matrices in this 8–10 week window. Lifetime Founder without fair-use + rate limits is a margin bomb once agents abuse it.

---

## 2. Findings against hypotheses H1–H6

### H1 — Devs pay ~$10/mo for private/permissioned shared lists + notes
**Unclear → weak hold**

- **For:** Finance products monetise portfolios/watchlists at ~$8–$40/mo (Yahoo Bronze $9.99, Simply Wall St Premium ~$15.99/mo secondary USD, TradingView Essential ~$14.95/mo reported). Buyers understand ACL from Notion/Linear-class tools. Free anonymous URL is weak for teams (token leak = full access; no roles).
- **Against:** Free already covers solo/anonymous use — classic freemium trap. Closest social plays either failed standalone (Commonstock → Yahoo Aug 2023) or monetise content/data, not ACL. Devs already use GitHub issues, Notion, Discord, Sheets for notes.
- **Implication:** Holds only if messaging is **“multiplayer + roles + permanent identity for humans and agents”**, not “private watchlist.”

### H2 — AI-agent angle > collaboration for this ICP
**Hold**

- **For:** ICP is developers / AI tooling; MCP / skills are a live purchasing mood. Finviz Elite explicitly markets export for “Automated Workflow / AI Agents.” ChatGPT / Perplexity ~$20/mo set WTP for agent capability; teemtape can be the cheaper *state* layer. Collaboration alone overlaps Sheets/Notion; agent-writable structured ticker state is rarer.
- **Against:** Agent tooling churns; “skill” may be novelty. Agents can hit free Yahoo/public APIs without paying teemtape. Human accountability on notes still needs collaboration.
- **Implication:** Lead with **agent + CLI as Pro hook**; keep permissions as trust/safety (scoped tokens, roles). Don’t sell “Discord for stocks.”

### H3 — $1000 Founder sells 20–50 in 90 days if community credible
**Unclear / optimistic**

- **For:** Sponsorware / founder launches with existing audiences have sold small caps (Porzio Sushi: 23→75 sponsors in ~2 days; Tailwind UI: hundreds of $k in days — both had large followings). Indie “first 100” LTD caps are common when scarcity is real.
- **Against:** 20–50 × $1000 = $20k–$50k needs warm list or breakout HN/X moment. Pre-PMF + undefined club weakens offer. Obsidian-style patrons pay **$25–$100**, not $1000, for recognition-heavy tiers. Porzio dollars were recurring $5–$N/mo, not $1000 one-shots.
- **Implication:** Treat 20–50 as **upside**, not the plan. Default without proof of reach: **0–10**. Waitlist conversion test before hard-charging Founder.

### H4 — Founder buyers value recognition ≈ lifetime access
**Hold for ICP** (does not hold for retail)

- **For:** Obsidian Catalyst: badges + insider channels are the product (~$25). Porzio sponsorware: logo-in-docs tiers mattered. GitHub README / SPONSORS.md are OSS cultural norms.
- **Against:** $1000 is too high for *only* a README shoutout; recognition is amplifier, not sole justification. Retail Discord buyers want signals/access, not GitHub fame.
- **Implication:** Bundle **lifetime Pro + visible sponsor listing + private channel with defined value**. Rough split for ICP: recognition ~30–40%, lifetime access ~40–50%; club must not be vapour.

### H5 — Free product alone is enough funnel
**Does not hold**

- **For:** OSS + anonymous URL is excellent top-of-funnel for devs (GitHub, HN, CLI). Self-host free / hosted paid is a proven Plausible/Ghost-shaped story — which teemtape already mirrors.
- **Against:** Pre-PMF + early usage ⇒ free funnel may be tiny. Commonstock needed Yahoo’s distribution. Retail finance paid products spend on content/SEO; teemtape won’t get that for free.
- **Implication:** Free is right **activation**. First 100 payers still need **deliberate GTM** (README, Show HN, X/dev, AI communities, skill directories). Separate retail channels not required if ICP stays developers.

### H6 — $100/yr (17% off) is right; bigger discount won’t move mix much
**Hold on gap** (unclear that bigger discount wouldn’t move share at all)

- **For:** ~2 months free (~16.7%) and ~20% annual discounts are standard (Yahoo ~20%; TradingView often ~13–17% by tier; Plausible “save 2 months”). Absolute savings on a $10 product are small ($20/yr).
- **Against:** Some products use 30–40% off or “3 months free”; presentation effects are real. Early mix will likely be monthly-heavy regardless.
- **Implication:** Keep **$100/yr**. Prefer **annual-default UX** over cutting to $80. Don’t bike-shed annual pricing in eng.

---

## 3. Competitor & pricing table

### Full comparison (from competitors research)

| Product | Target user | Free tier | Paid price(s) | Collaboration | Community | API / agent access | Strengths | Weaknesses vs teemtape thesis |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| **TradingView** | Active retail & semi-pro chartists | Basic free (ads, 1 chart/tab, 1 watchlist, limited alerts) | **USD reported:** Essential ~$14.95/mo or ~$12.95/mo annual; Plus ~$29.95–$34.95/mo or ~$24.95–$29.95 annual; Premium ~$59.95–$69.95/mo or ~$49.95–$59.95 annual; Ultimate ~$199.95–$239.95/mo annualized. Official page is **geo-localized** (fetch showed €); confirm USD at checkout. | Shared ideas/scripts; invite-only scripts on higher tiers; **not** multi-role private watchlist ACL | Huge public idea/script community | Webhooks on Plus+; Pine; limited AI screener quotas by tier; no first-class “human+agent annotate same list” | Best-in-class charts, data depth, brand | Overkill / wrong job for “notes on a shared ticker list”; collab is social-publish, not permissioned multiplayer docs |
| **Stocktwits (Edge)** | Social sentiment retail traders | Free feed + ads | Ad-free: **$85/yr** (was $96); Edge: **$229.50/yr** (was $274.50) on web; monthly Edge often cited **$22.95/mo**. App Store IAPs differ (Edge ~$29.99/mo / $299.99/yr). | Public stream; watchlist activity in Edge | Large ticker-message community | Enterprise API (contact sales) — **price unknown** | Sentiment + social discovery | Not private collab; not agent-native; “Edge” sells data overlays, not shared annotation workspace |
| **Yahoo Finance Plus (Bronze / Silver / Gold)** | Mass retail portfolio trackers | Broad free news/quotes/portfolios | Monthly: Bronze **$9.99**, Silver **$24.95**, Gold **$49.95**. Annual (~20% off): **$95.40**, **$239.40**, **$479.40** (~$7.95 / $19.95 / $39.95/mo). | Limited sharing; community features partly via prior Commonstock DNA | Yahoo Finance message boards / community at scale | Export / research tools on Gold; **agent-native API for consumer Pro: not a primary pitch** | Trusted brand; portfolio+news; Bronze lands near $10 | Data/research monetization, not developer multiplayer notes; no CLI/agent skill story |
| **Seeking Alpha Premium / Pro** | Fundamental long-term investors | Basic free articles limited | Premium: intro **$4.95** first month then **$299/yr** (list); Pro: **$99** first month then **$2,400/yr**. | Commenting on articles; not multi-role watchlist ACL | Author/community content economy | Research tools + AI features inside Premium; **open agent API for watchlists: unknown / not core** | Deep research moat | Wrong ICP; 3–25× teemtape’s proposed $100/yr |
| **Finviz Elite** | US equity screeners / technical scanners | Free delayed quotes + basic screener | Monthly **$39.50**; annual **$299.50** (~**$24.96/mo**). | Personal portfolios; not team ACL | Weak vs social platforms | **Export** marketed for automated workflows / AI agents | Screener + real-time + export for agents | No shared commenting product; agent story = CSV/API export, not collaborative annotation |
| **Koyfin** | Serious retail analysts + advisors | Free research lite | Plus **$39/mo**, Premium **$79/mo**, Advisor Core **$209/mo**, Advisor Pro **$299/mo** (annual toggle exists; **exact annual USD not confirmed in fetch**). | Teams option (custom) | Low | Professional data workflows | Institutional-grade analytics | Far above $10; advisor ICP, not indie hacker watchlist notes |
| **Simply Wall St** | Visual fundamental retail | Free: limited reports, 1 portfolio / 10 holdings, 3 watchlists | Secondary USD: Premium **$15.99/mo** or **$131.40/yr**; Unlimited **$258/yr**. Official plans page often **client-rendered USD** — verify at checkout. | Shareable portfolios | Community Narratives | Charlie AI on paid; export on Unlimited | Close price neighbor to $10–$15 | Portfolio/narrative product, not agent+human shared list |
| **Commonstock** (acquired) | Social retail with verified portfolios | Was free-ish social product | **N/A (standalone shut / absorbed)** | Broker-linked portfolio sharing, friend trade alerts | Social investing community | N/A | Proved demand for social + verified holdings | **Acquired by Yahoo Aug 2023**; lesson: social investing hard to scale alone |
| **Discord / Telegram paid trading communities** | Signal seekers / discretionary traders | Free servers (noise) | Typical paid rooms often **~$29–$200/mo**; premium signal rooms often **~$79–$149**; high-touch **$200–$500**. **Ranges only.** Monthly churn often cited **~7–10%** (better ~3–5% with strong ops). | High (chat + roles) | **The product is the community** | Bots / webhooks common; not structured watchlist ACL | Engagement + FOMO | High churn; advice/signal regulatory risk; opposite of teemtape’s “not advice” posture; poor fit as *core* Pro value |
| **Substack finance paid / community tiers** | Newsletter audiences | Free posts | Common paid newsletters **~$8–$20/mo** or **~$80–$200/yr**; community/access tiers often **~$13–$29/mo**; some Pro much higher (**hundreds–$1,200/yr** cited in secondary pieces — **verify per publication**). | Chat / private posts / calls depending on creator | Creator community | Rarely agent-native | Proven WTP for *access + writing* | Monetises audience/trust, not a multiplayer OSS tool; Founder $1000 closer to “creator Pro” than SaaS seat |
| **Perplexity Finance** | Retail + research with AI Q&A | Finance browsing / watchlists largely free (account for saves/alerts) | Perplexity Pro commonly **$20/mo** (Max higher, often **$200/mo** cited). Finance portfolio via Plaid read-only. | Personal portfolios/watchlists | Weak | Strong AI research; Agent API `finance_search` for builders | Agent-adjacent research UX | Not multi-user permissioned lists; competes for “ask AI about tickers” mindshare |
| **ChatGPT (Plus / agent workflows)** | General knowledge workers + builders | Free tier | Plus commonly **$20/mo** (OpenAI plan page). | Custom GPTs / projects shared ad hoc | Weak | **Strongest general agent runtime**; user brings tools/MCP | Default place agents live | No durable shared ticker annotation product; teemtape must be the *state layer* agents write into |
| **MCP / OSS finance agent tools** (Alpha Vantage MCP, stock-scanner-mcp, etc.) | Developers wiring Claude/Cursor agents | Mostly free OSS; data APIs have their own keys/limits | Data vendor keys vary (confirm current tiers); MCP servers typically $0 | Local/shared via user’s infra | Dev community | **Native agent access** | Closest tech analogy to teemtape CLI/skill | Fragmented; no hosted multiplayer permissions; teemtape Pro can be the hosted source-of-truth on top |
| **teemtape (proposed Pro)** | Devs / indie hackers / AI-tooling users who annotate tickers | Free anonymous URL-token watchlist + self-host | Proposed: **$10/mo**, **$100/yr**, Founder **$1000** lifetime | Owner/editor/commenter/viewer; invite collaborators (collaborators don’t pay) | Optional “club” undefined | CLI + AI-agent skill (differentiation) | Unique: human+agent same list; OSS free forever self-host | Pre-PMF; delayed data; no charts/research moat; must sell workflow not data |

### Where $10 / $100 / $1000 sit

#### $10/mo
| Segment | Fit | Why |
| --- | --- | --- |
| **Developer / AI tooling (teemtape ICP)** | **Right-to-slightly-high** until value proven | Same band as Plausible-style indie SaaS entry, Obsidian Sync (~$4–5), Yahoo Bronze (~$10), Simply Wall St Premium monthly (~$16). Devs pay $10–$20 for tools that save time *if* habit exists. **Risk:** free anonymous URL already does the core job → WTP collapses unless Pro unlocks *account permanence + permissions + agent auth*. |
| **Retail traders** | **Low / cheap** | TradingView Essential alone is ~$15; Stocktwits Edge ~$23; Finviz ~$25–40. They pay for *data/charts*, not $10 for notes — and won’t pay $10 for teemtape without a data edge. |
| **Serious research subscribers** | **Irrelevant / too cheap to signal** | SA Premium $299/yr buyers aren’t shopping $10 tools for research. |

**Verdict:** $10/mo is **market-plausible for the stated ICP**, not “too low to be credible,” but **not justified by feature parity with finance SaaS** — only by workflow lock-in.

#### $100/yr (~17% off vs $120)
| Segment | Fit | Why |
| --- | --- | --- |
| Indie SaaS norms | **Right** | “2 months free” (~16.7%) is textbook; Yahoo uses ~20%; TradingView often ~13–17% by tier. |
| Finance SaaS | **Low absolute** | Competitors’ annual tickets run $95 (Yahoo Bronze) to $229–$299 (Stocktwits Edge / Finviz / SA). teemtape at $100 is **cheap for finance**, **normal for indie tool**. |
| Annual mix | Expect majority monthly early; don’t expect >~40–50% annual without annual-default UX. |

**Verdict:** Gap size is **fine**. Absolute annual price is **not the bottleneck**; conversion will be.

#### $1000 lifetime Founder
| Segment | Fit | Why |
| --- | --- | --- |
| Dev/OSS patrons | **Aggressive but in the known playbook** | Obsidian Catalyst is only $25–$100 one-time. Tailwind UI early was ~$149–$249 with huge audience. $1000 ≈ **8.3 years of $10/mo** or **10 years of $100/yr** — needs **status + access + belief**, not “lifetime discount” maths. |
| Retail “trader club” buyers | Comparable to 2–6 months of expensive Discord or a year of SA-adjacent spend — but **expectation mismatch** if they expect signals/P&L. |
| AppSumo LTD shoppers | Different market (often $39–$179 LTDs) — **don’t conflate**. |

**Verdict:** $1000 is a **patron / founder / sponsorware** price, not a competitor SaaS tier. Sellable only with **credible community + clear perks + scarcity**. Without that, too high. Hosted SaaS lifetime is riskier than Tailwind-style downloadable assets (you keep paying infra forever) — fair-use + rate limits in ToS from day one.

### Price-position schematic

```
$0 -------- $10 -------- $20 -------- $40 -------- $100+/mo
 |           |            |            |             |
 teemtape    teemtape     ChatGPT/     Finviz/       Koyfin/
 free        Pro (prop.)  Perplexity   Stocktwits    Advisor
             Yahoo Bronze Pro          Edge          SA Pro
             SWS Premium               TV Plus
```

teemtape Pro sits in the **indie tool / lite finance** pocket — correct *if* sold as workflow software, wrong if sold as market-data Pro.

---

## 4. Recommendations on open decisions

Decision IDs aligned to the brief (early-flags used **D3** for free signed-in; that maps to brief **D4** below). There is no brief **D3**.

| ID | Decision | Recommendation | Rationale |
| --- | --- | --- | --- |
| **D1** | Founder Stripe vs GitHub Sponsors | **Stripe for $1000 Founder + Pro entitlement.** Optionally also enable GitHub Sponsors for small recurring $5–$20 tips. Dual-list in README: “Founders (Stripe)” + “Sponsors (GitHub).” | Stripe maps cleanly to Pro flag, club access, ToS. Native GH Sponsors badge is nice-to-have; warping the SKU for it is not worth it. Devs care about **visible credit**, not which processor minted it. |
| **D2** | What the “club” / trader club is | **Not a trader club.** Prefer **ship Pro with zero club**, add circle after 20+ paying Pros. If anything: external **Founders’ Circle** + internal **Tape Room** = roadmap AMAs, agent recipes, **no stock picks**. | “Trader club” imports signal-room expectations, high churn (~7–10%/mo typical for paid Discords), and advice optics (NZ FAP-shaped risk + US social-trading scrutiny — **research notes; get counsel**). Name alternatives that fit ICP: Founders’ Circle, Tape Room, Annotators Guild, Agents & Humans Lab. Avoid Alpha/Picks Club. |
| **D4** | Free signed-in (was early-flags D3) | **Yes — free signed-in, 1 saved list.** Pro = multi-list + roles + agent API keys / higher limits. Do **not** make accounts Pro-only. | Yahoo / TradingView / Simply Wall St all allow free accounts and upgrade capacity. Pro-only accounts choke agents and the funnel. Mitigates freemium trap without locking *all* accounts behind paywall. |
| **D5** | Prices / cap (was early-flags D4) | **$10/mo and $100/yr keep.** Founder **$1000 optional**, cap **50**, sell after private beta *or* refundable pre-order. Publish a public counter; state what happens at sellout. | Prices are in-band for ICP. Founder without demand signal should not be the plan — default forecast single digits. Fake scarcity burns the exact ICP (devs). |
| **D6** | Pre-sell (was early-flags D5) | **Soft yes:** waitlist + “notify when Pro opens.” Hard-charge Founder only with written v1 scope, ship window, fair-use, and refund policy. Safer shapes: $100 refundable deposit → Founder at ship; or sell annual $100 first and offer Founder upgrade credit later. | Selling “club + Pro forever” while club is undefined → chargebacks and HN pile-on. Pre-sellers expect ship window, refund/escrow, inclusions/exclusions, and ongoing communication. |
| **D7** | Name (tier + surface; covers early-flags D6 + D7) | **Tier:** `teemtape Pro` (clear). Avoid Elite / Edge / Premium finance cosplay. **Founder:** `Founders’ Circle` not Trader Club. **Surface:** Prefer leading with **teemtape Pro** / `app.teemtape.com` / `pro.teemtape.com`. “Dashboard” is OK but generic — keep `dashboard.teemtape.com` if already wired; don’t burn cycles renaming; don’t lead marketing with “Dashboard.” | Clarity over finance cosplay. Product-true names reduce advice connotations. |

### Packaging (also required)

| Topic | Recommendation |
| --- | --- |
| **Collaborators don’t pay** | **Owner pays; collaborators free** for v1. Matches invite-your-friends viral pattern; Discord-style gate on server owner. Revisit seats only if teams/orgs appear (Koyfin Teams / Obsidian Sync per-user are later patterns). |
| **Agent vs permissions as hook** | **Market agent/CLI**; ship permissions as the trust layer agents require (scoped tokens, roles). Finviz sells export/automation; ACL alone is table stakes for “Pro.” |
| **Monthly vs annual** | Offer both; **highlight annual** at checkout. Expect early mix monthly-heavy; annual rises with trust. Don’t bike-shed discount beyond $100/yr. |
| **GTM one-liners (2–3)** | 1. Show HN / README: *“OSS ticker tape humans and agents comment on — Pro adds roles + API keys.”* 2. Agent demo: *Claude/Cursor skill posting a note to a shared list in 30 seconds.* 3. Indie angle: *“Anonymous watchlist URL was the wedge; Pro is how small teams stop leaking the token.”* Stay on GitHub / dev X / HN / AI communities for v1 — no retail channels required yet. |
| **Dashboard naming** | Functional, not brand-defining. Lead with **teemtape Pro**; keep existing dashboard subdomain if wired. |

### If you insist on selling Founder — perk stack

**Must-have (or don’t sell):** (1) Lifetime hosted Pro — defined feature set + fair-use; (2) README / SPONSORS.md logo or name; (3) Private channel with scheduled AMA / roadmap influence — **not stock picks**; (4) Early access to agent skill / API keys / higher agent rate limits.

**Nice-to-have:** One-time strategy session on wiring agents (Porzio-style consulting lite); exclusive MCP/skill templates; physical sticker.

**Do not sell as core:** Undifferentiated trader chat; native GH Sponsors badge alone; unscoped “Pro forever including all future enterprise.”

### Success criteria for next 90 days

- [ ] ≥1 free→signed-in conversion path live
- [ ] Pro checkout ($10/$100) live before Founder
- [ ] Public agent skill demo published
- [ ] If Founder: written scope, fair-use, cap, refund — or don’t sell it
- [ ] Zero marketing copy that implies trading signals or personalized advice

---

## 5. Sources / evidence appendix

Deduplicated URLs. **Access date for all: 2026-09-17.**

### Competitor pricing & products
1. https://www.tradingview.com/pricing/
2. https://www.stockbrokers.com/review/tools/tradingview
3. https://friendofthetrend.com/tradingview/plan-comparison/
4. https://stocktwits.com/subscriptions
5. https://www.wallstreetzen.com/blog/stocktwits-review/
6. https://finance.yahoo.com/about/plans/select-plan/
7. https://bullishbears.com/yahoo-finance-premium-review/
8. https://seekingalpha.com/subscriptions
9. https://help.seekingalpha.com/what-is-seeking-alpha-premium
10. https://www.stockbrokers.com/review/tools/seeking-alpha
11. https://finviz.com/elite/
12. https://www.koyfin.com/pricing/plans-comparison/
13. https://www.koyfin.com/pricing-llm-info/
14. https://simplywall.st/plans
15. https://toolchase.com/tool/simplywallst/
16. https://www.yahooinc.com/press/yahoo-acquires-commonstock-to-expand-community-deepen-insights-for-yahoo-finance-users
17. https://www.axios.com/2023/08/23/commonstock-yahoo-social-investing-platform
18. https://www.perplexity.ai/finance
19. https://www.perplexity.ai/finance/portfolio
20. https://openai.com/ChatGPT/pricing

### Communities, newsletters, churn (directional)
21. https://shipworkflow.com/blog/how-much-do-paid-discord-communities-make
22. https://doorfee.io/blog/discord-server-analytics-revenue-growth
23. https://purepowerpicks.com/best-options-trading-community-discord-groups/
24. https://inboxalchemy.co/blog/paid-newsletter-pricing
25. https://wolf.financial/blog/substack-vs-patreon-premium-community-monetization

### Founder / sponsorware / lifetime patterns
26. https://calebporzio.com/sponsorware
27. https://obsidian.md/pricing
28. https://www.indiehackers.com/post/adam-wathan-just-made-500k-in-3-days-from-his-new-product-603feefe61
29. https://adamwathan.me/journal/2020/12/29/2020-year-in-review/
30. https://once.com/campfire
31. https://world.hey.com/dhh/campfire-is-once-1-d2cebd12
32. https://plausible.io/docs/subscription-plans
33. https://web.archive.org/web/20201204085945/https:/www.kickstarter.com/projects/johnonolan/ghost-just-a-blogging-platform
34. https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/displaying-a-sponsor-button-in-your-repository
35. https://gatilab.com/economics-of-lifetime-deals/
36. https://www.operatorbook.dev/stories/the-month-my-appsumo-lifetime-deal-caught-up-with-me-42k-mrr

### Regulatory research notes (not advice — verify current pages; get qualified counsel)
37. https://www.fma.govt.nz/business/services/financial-advice-provider/
38. https://www.fma.govt.nz/library/articles/talking-about-money-online/
39. https://www.investor.gov/introduction-investing/general-resources/news-alerts/alerts-bulletins/investor-bulletins-33

---

## 6. Open questions / gaps

What would settle remaining unknowns:

| Gap | Why it matters | What would settle it |
| --- | --- | --- |
| **teemtape funnel metrics** (stars, X followers, newsletter, active watchlists, free→signed-in if any) | H1 / H3 / H5 partly untestable without usage data | Export analytics + GitHub/X baseline; weekly active shared lists |
| **Primary WTP survey of current users** | No primary survey done; $10 and $1000 are competitor-inferred | 10–20 founder interviews + simple pricing poll (Van Westendorp optional) |
| **Waitlist → paid conversion** | Founder 20–50 in 90 days is upside case | Soft waitlist for Pro; measure click→email→intent before hard-charging $1000 |
| **TradingView / Simply Wall St / Koyfin exact USD at checkout** | Official pages geo- or JS-localised; secondary USD used in table | Confirm USD at checkout before any customer-facing competitor comparison copy |
| **Stocktwits Enterprise API pricing** | Contact-sales; unknown | Only needed if positioning against enterprise API — skip for v1 |
| **Discord/Telegram “typical” prices** | Ranges only; huge quality variance | Treat as directional; do not quote a single sticker in GTM |
| **NZ FAP / US adviser optics for any planned club format** | NZ entity + US users + picks/chat can create advice-shaped risk even with disclaimers | **Qualified counsel** (not this memo) before any Founder community that discusses tickers as recommendations |
| **Lifetime hosted cost under agent abuse** | $1000 Forever × unbounded agent calls = margin bomb | Fair-use + rate limits in ToS; measure agent call volume in private beta before Founder |
| **Whether seats appear among early Pros** | Owner-pays / collaborators-free may need revisit | Ship without seats; review after first 20 Pros if multi-seat teams show up |

**Honest research limits:** No invented prices beyond vendor pages / secondary quotes cited above. No primary user survey. Regulatory section is research notes only — not legal advice.
