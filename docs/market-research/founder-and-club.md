# Founder / Lifetime / Sponsorware & “Trader Club” Research

**Access date for all citations: 2026-09-17**  
**Product context:** teemtape proposed Founder tier — **$1000 one-time**, Pro forever, GitHub sponsor listing (Stripe-funded, README/SPONSORS — not necessarily GitHub Sponsors native badge), plus “exclusive trader club” (undefined). NZ business; US users likely. Product: not trading, not advice, delayed quotes.  
**Not legal advice** — regulatory section is research notes only.

---

## 1. Lifetime / founder / sponsorware patterns

### 1.1 Caleb Porzio — Sponsorware (closest OSS cultural fit)

- **Model:** Release package privately to GitHub Sponsors; open-source after hitting a sponsor count.
- **Case (Sushi, Feb 2020):** 23 sponsors / $573/mo → **75 sponsors / $1,560/mo in ~2 days** (~+$11.8k/yr run-rate). Later ~101 sponsors / $2,633/mo at time of writing.
- **Perk drivers:** Early private access to code; higher tiers included **logo in docs** + light consulting.
- **Critical caveat (Porzio’s own):** Worked because of existing audience (then ~10k Twitter, 3.4k email) and a small eye-catching package.
- Source: https://calebporzio.com/sponsorware  

**teemtape takeaway:** Sponsorware proves **devs will pay for early access + recognition**, but Porzio’s dollars were **recurring $5–$N/mo sponsors**, not $1000 one-shots. A $1000 Founder is a different instrument — closer to “patron whale” than classic sponsorware.

### 1.2 Obsidian Catalyst (recognition-heavy, cheap one-time)

| Tier (historical help docs / pricing page) | Price | Perks |
| --- | --- | --- |
| Catalyst (Insider / Supporter / VIP historically; current page shows single Catalyst) | **$25 one-time** (current pricing page) | Early beta access, community badges, exclusive channels |
| Commercial | **$50/user/yr** optional | Support development / featured org — **not required for commercial use** |
| Sync (separate) | **$4/user/mo** annual | Actual product value |

Source: https://obsidian.md/pricing  

**teemtape takeaway:** Recognition + insider channel alone clears **$25–$100**, not $1000. If Founder is $1000, **lifetime Pro must carry most of the value**; badge is garnish.

### 1.3 Tailwind UI early access (product LTD done right)

- Early access launch (2020): commonly reported **$149** (half) / **$249** (complete); later All-Access lifetime packaging around **$299** (evolved over time — confirm current Tailwind Plus pricing separately if needed).
- Revenue outcome: Adam Wathan reported on the order of **~$400k day-one / $500k+ in ~3 days** — with a massive existing Tailwind CSS audience.
- Sources: https://www.indiehackers.com/post/adam-wathan-just-made-500k-in-3-days-from-his-new-product-603feefe61 ; https://adamwathan.me/journal/2020/12/29/2020-year-in-review/  

**teemtape takeaway:** High one-time prices work when (1) artifact is immediately useful, (2) audience is huge and warm, (3) “lifetime” maps to downloadable/design assets with low marginal cost. Hosted SaaS lifetime is riskier (you keep paying infra forever).

### 1.4 Basecamp / 37signals ONCE (one-time self-host)

- Campfire ONCE originally sold as **one-time ~$299** self-host with source + years of fixes (historical DHH posts).
- As of research date, Campfire is positioned as **free open source** self-host via once.com — no current purchase price on the marketing page fetched.
- Sources: https://once.com/campfire ; https://world.hey.com/dhh/campfire-is-once-1-d2cebd12  

**teemtape takeaway:** ONCE validates **buy once, host yourself**. teemtape already gives self-host free — so Founder must sell **hosted Pro forever + status**, not “get the code” (code is already OSS).

### 1.5 Plausible / Ghost “founder” lore

| Product | What actually existed | Current |
| --- | --- | --- |
| **Plausible** | Privacy analytics; self-host CE free; cloud subscription. Docs: yearly = **save 2 months**. Starter/Growth/Business by traffic. **No current official lifetime Founder tier found on docs.** | https://plausible.io/docs/subscription-plans |
| **Ghost** | 2013 Kickstarter “Founder Pack”: early access, username, hosting credits, founder emblem — **first ~100** at a discount (~30% off cited on archive). Not a modern $1000 SaaS LTD. | https://web.archive.org/web/20201204085945/https:/www.kickstarter.com/projects/johnonolan/ghost-just-a-blogging-platform |

**teemtape takeaway:** “Founder” branding is powerful in OSS-adjacent communities; **don’t cargo-cult Ghost Kickstarter or imagined Plausible LTDs**. Plausible’s durable lesson is **self-host free / cloud paid**, which teemtape already mirrors.

### 1.6 AppSumo-style LTDs (what to avoid)

**Downsides (vendor-side, repeatedly reported):**
- Support load explodes (high-touch users who paid once).
- Revenue cannibalization of future SaaS; hard to migrate LTD users to recurring.
- “Lifetime” = lifetime of *product*; refunds/chargebacks; feature-gating fights.
- One-time cash feels great → then infra/AI/support costs continue.

Illustrative sources: https://www.operatorbook.dev/stories/the-month-my-appsumo-lifetime-deal-caught-up-with-me-42k-mrr ; https://gatilab.com/economics-of-lifetime-deals/ ; public SaaS founder postmortems on Reddit/AppSumo blog (quality varies).

**teemtape takeaway:** A **capped Founder (50–100)** sold on your own site ≠ AppSumo firehose. Still: price Founder as **patronage + early belief**, keep scope bounds (hosted Pro features as of date X + listed perks), and **do not** promise unbounded future enterprise features forever without fine print.

### 1.7 GitHub Sponsors one-time vs Stripe Founder

| Path | Pros | Cons | Audience care? |
| --- | --- | --- | --- |
| **GitHub Sponsors native** | Sponsor button on repo; cultural fit; optional profile badge; sponsors list integrations | Platform constraints; less flexible packaging ($1000 one-time + club + Pro entitlement mapping is awkward); payout/tax ops still real | **Devs notice the Sponsor button** more than strangers |
| **Stripe Checkout + README/SPONSORS.md listing** | Full control of Founder SKU, club access, Pro flag in dashboard; clear ToS | No native GitHub “Sponsoring” badge unless also on GH Sponsors | **README logo wall still respected** in OSS; many projects list Open Collective/Stripe/GitHub side by side |

Docs on displaying sponsor button: https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/displaying-a-sponsor-button-in-your-repository  

**Verdict for teemtape:** Prefer **Stripe for the $1000 Founder commerce** (maps cleanly to Pro entitlement). Optionally **also** enable GitHub Sponsors for small recurring $5–$20 tips. Dual-list in README: “Founders (Stripe)” + “Sponsors (GitHub)”. Audience cares about **visible credit**, not which processor minted it — but **GitHub-native badge is a nice-to-have, not worth warping the product SKU**.

---

## 2. Unit counts, caps, and “first 100” evidence

| Pattern | Typical cap | What sold | Notes |
| --- | --- | --- | --- |
| Sponsorware threshold | 40–100 sponsors | Recurring sponsors | Cap is a *release trigger*, not inventory of $1000 seats |
| Ghost Kickstarter Founder Pack | First ~100 | Discounted founder pack | Scarcity + emblem |
| Indie “first 100” LTD | 50–100–500 | Lifetime seats | Works when next price step is real |
| Tailwind UI | Effectively uncapped early | High volume | Audience size dominated scarcity |

**Evidence quality:** Caps help **conversion theater** only if (a) you will actually stop or raise price, and (b) demand exists. Fake “only 3 left” burns trust with the exact ICP (devs) you want.

**For $1000 Founder aiming 20–50 in 90 days:**
- Cap at **50 or 100** is fine.
- Publish a **public counter**.
- State what happens at sellout (e.g. Founder closes; annual remains).
- Without warm reach, expect **0–10**, not 20–50 — **flag as unknown until waitlist test**.

---

## 3. Pre-sell before features — buyer expectations

**What pre-sellers expect (from SaaS/OSS norms):**
1. Clear **ship window** (e.g. “Pro hosted ACL + accounts within 8–10 weeks”).
2. **Refund path** if you miss (or escrow-like “charge when ready”).
3. Listed **v1 inclusions / exclusions** (no real-time data, no brokerage sync, no trading).
4. Ongoing communication (changelog, private channel).

**Failure mode:** Selling “trader club + Pro forever” while club is undefined → chargebacks and HN pile-on.

**Safer pre-sell shapes:**
- **$100 refundable Founder deposit** → converts to Founder at ship, or  
- **Founder only after private beta works**, with waitlist now, or  
- Sell **annual $100** first; offer Founder upgrade credit later.

---

## 4. “Trader clubs” — what members value, platforms, churn

### What members typically value
1. **Timely ideas / alerts** (highest willingness to pay — also highest regulatory heat).
2. **Camaraderie / accountability** (watch together, journal).
3. **Education** (frameworks, not tickers).
4. **Access to a person** (AMA with founder/analyst).
5. **Status** (badge, exclusive room).

### Platforms
- Discord / Telegram (dominant for paid rooms).
- Circle / Geneva / Slack (more “premium community”).
- Substack chat + Zoom (creator-led).

### Pricing & churn (directional)
- Paid trading Discords often **~$29–$200/mo**; signal rooms higher.
- Churn often **~7–10%/mo** unless ops are excellent (onboarding, wins posting, moderation).
- Sources: https://shipworkflow.com/blog/how-much-do-paid-discord-communities-make ; https://doorfee.io/blog/discord-server-analytics-revenue-growth  

### What “club” means in practice
Usually: **private chat + roles + occasional calls + shared watchlists/signals**. Rarely: formal investment club with pooled capital (that triggers a different legal analysis — see below).

**Mismatch with teemtape:** Product brand says not a trading app / not advice. A “trader club” name **imports signal-room expectations** your eng plan will not deliver in 8–10 weeks.

---

## 5. Regulatory / reputational pitfalls (research notes only — not advice)

### New Zealand (business domicile)
- FMA materials distinguish **general financial education** from **regulated financial advice**.
- Personalized recommendations, product promotion, or “you should buy X” can cross into advice territory; a disclaimer alone may not cure that.
- Providing advice to retail clients generally requires a licensed **Financial Advice Provider** regime.
- Sources to read (verify current pages): https://www.fma.govt.nz/business/services/financial-advice-provider/ ; FMA “Talking about money online” (Cloudflare sometimes blocks automated fetch — open manually): https://www.fma.govt.nz/library/articles/talking-about-money-online/  
- NZ Retirement Commission financial education guidance also stresses education vs recommending products.

### United States (likely users)
- **Investment clubs:** SEC Investor Bulletin — clubs that pool money / have passive members can implicate securities / investment company issues; paid advice selectors may be advisers. https://www.investor.gov/introduction-investing/general-resources/news-alerts/alerts-bulletins/investor-bulletins-33  
- Social trading / testimonials: SEC/FINRA scrutiny around advice, testimonials, and influencer promotions (esp. if compensated).
- Even without registration, **antifraud** and marketing claims matter.

### Product-specific risk amplifiers for teemtape
| Do | Don’t |
| --- | --- |
| Position as **annotation / collaboration / journaling tool** | Promise alerts that “beat the market” |
| Club = **builders & agents sharing notes** | Club = **daily tickers to buy** |
| Heavy “not advice / delayed data / not a broker” | Founder selling stock picks in the club |
| Moderation + ToS forbidding personalized advice | Performance leaderboards that look like managed signals |

**Reputational:** One bad “teemtape Founder club pumped a ticker” screenshot can erase OSS goodwill.

---

## 6. Better names than “trader club”

Prefer names that match ICP + reduce advice connotations:

| Name | Tone | Fit |
| --- | --- | --- |
| **Founders’ Circle** | Patron | Strong for $1000 |
| **Annotators Guild** | Product-true | Quirky, on-brand |
| **Tape Room** | Product-true | Short |
| **Agents & Humans Lab** | AI angle | Matches H2 |
| **Pro Lounge** | Generic SaaS | Safe, boring |
| **Watchlist Cabal** | Indie humor | HN-friendly |
| **Sponsor Circle** | OSS | Fits README listing |
| ~~Trader Club~~ | Signal-room | **Avoid** |
| ~~Alpha Club / Picks Club~~ | Advice-coded | **Avoid** |

**Recommendation:** **Founders’ Circle** (external) + private Discord/Circle named **Tape Room** (internal). Never lead with “trader.”

---

## 7. Perk stack that can justify ~$1000 (if you insist)

**Must-have (or don’t sell):**
1. Lifetime hosted Pro (defined feature set + fair-use).
2. README / SPONSORS.md logo or name (public recognition).
3. Private channel with **scheduled AMA / roadmap influence** (not stock picks).
4. Early access to agent skill / API keys / higher agent rate limits.

**Nice-to-have:**
5. One-time strategy session on wiring agents to teemtape (Porzio-style consulting lite).
6. Exclusive MCP/skill templates.
7. Physical sticker (cheap; surprisingly liked).

**Do not sell as core:**
- Undifferentiated “trader chat”
- Native GitHub Sponsors badge only (insufficient)
- Unscoped “Pro forever including all future enterprise”

---

## 8. H3 / H4 revisit (founder-specific)

| Hypothesis | Lean | Evidence in this doc |
| --- | --- | --- |
| **H3:** 20–50 Founder units in 90 days if community credible | **Unclear / optimistic** | Needs Porzio/Tailwind-class warmth; pre-PMF suggests start with waitlist conversion test |
| **H4:** Recognition ≈ lifetime access | **Hold for ICP** | Catalyst/sponsorware show recognition matters; at $1000 still need lifetime Pro + concrete access |

---

## 9. Unknowns

- Exact size/engagement of teemtape GitHub stars, X followers, newsletter, active watchlists — **required to sanity-check H3**.
- Whether NZ FAP licensing analysis applies to any planned club format — **needs qualified counsel**, not this memo.
- Current Tailwind Plus / Ghost(Pro) founder grandfather details — not needed for decision.
- Empirical WTP survey of teemtape users for $1000 — **not done**.

---

## 10. Sources (access date 2026-09-17)

1. https://calebporzio.com/sponsorware  
2. https://obsidian.md/pricing  
3. https://www.indiehackers.com/post/adam-wathan-just-made-500k-in-3-days-from-his-new-product-603feefe61  
4. https://adamwathan.me/journal/2020/12/29/2020-year-in-review/  
5. https://once.com/campfire  
6. https://world.hey.com/dhh/campfire-is-once-1-d2cebd12  
7. https://plausible.io/docs/subscription-plans  
8. https://web.archive.org/web/20201204085945/https:/www.kickstarter.com/projects/johnonolan/ghost-just-a-blogging-platform  
9. https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/displaying-a-sponsor-button-in-your-repository  
10. https://www.investor.gov/introduction-investing/general-resources/news-alerts/alerts-bulletins/investor-bulletins-33  
11. https://www.fma.govt.nz/business/services/financial-advice-provider/  
12. https://shipworkflow.com/blog/how-much-do-paid-discord-communities-make  
13. https://gatilab.com/economics-of-lifetime-deals/  
14. https://www.operatorbook.dev/stories/the-month-my-appsumo-lifetime-deal-caught-up-with-me-42k-mrr  
