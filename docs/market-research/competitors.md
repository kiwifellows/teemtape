# teemtape Pro — Competitor & Pricing Landscape

**Research date / access date for all citations: 2026-09-17**  
**Scope:** Hosted Pro packaging for teemtape.com (OSS ticker commenting / shared watchlists; delayed ~1min quotes; not trading; CLI + AI-agent skill). Audience today = developers / indie hackers / AI tooling, early / pre-PMF.  
**Method note:** Prices below are from vendor pages or recent secondary reviews that quote vendor prices. Where a page is geo-localized (e.g. TradingView EUR) or JS-rendered without USD, that is flagged. **Do not treat this as financial, legal, or investment advice.**

---

## 1. Comparison table

| Product | Target user | Free tier | Paid price(s) | Collaboration | Community | API / agent access | Strengths | Weaknesses vs teemtape thesis |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| **TradingView** | Active retail & semi-pro chartists | Basic free (ads, 1 chart/tab, 1 watchlist, limited alerts) | **USD reported:** Essential ~$14.95/mo or ~$12.95/mo annual; Plus ~$29.95–$34.95/mo or ~$24.95–$29.95 annual; Premium ~$59.95–$69.95/mo or ~$49.95–$59.95 annual; Ultimate ~$199.95–$239.95/mo annualized. Official pricing page is feature-rich but **geo-localized** (fetch showed €); confirm USD at checkout. Sources: [tradingview.com/pricing](https://www.tradingview.com/pricing/), [stockbrokers.com review](https://www.stockbrokers.com/review/tools/tradingview), [friendofthetrend plan comparison](https://friendofthetrend.com/tradingview/plan-comparison/) | Shared ideas/scripts; invite-only scripts on higher tiers; **not** multi-role private watchlist ACL like proposed Pro | Huge public idea/script community | Webhooks on Plus+; Pine; limited AI screener quotas by tier; no first-class “human+agent annotate same list” product | Best-in-class charts, data depth, brand | Overkill / wrong job for “notes on a shared ticker list”; collaboration is social-publish, not permissioned multiplayer docs |
| **Stocktwits (Edge)** | Social sentiment retail traders | Free feed + ads | Ad-free: **$85/yr** (was $96); Edge: **$229.50/yr** (was $274.50) on web; monthly Edge often cited **$22.95/mo**. App Store IAPs differ (Edge ~$29.99/mo / $299.99/yr). Sources: [stocktwits.com/subscriptions](https://stocktwits.com/subscriptions), [wallstreetzen Stocktwits review](https://www.wallstreetzen.com/blog/stocktwits-review/) | Public stream; watchlist activity in Edge | Large ticker-message community | Enterprise API (contact sales) — **price unknown** | Sentiment + social discovery | Not private collab; not agent-native; “Edge” sells data overlays, not shared annotation workspace |
| **Yahoo Finance Plus (Bronze / Silver / Gold)** | Mass retail portfolio trackers | Broad free news/quotes/portfolios | Monthly: Bronze **$9.99**, Silver **$24.95**, Gold **$49.95**. Annual (~20% off): **$95.40**, **$239.40**, **$479.40** (~$7.95 / $19.95 / $39.95 /mo). Sources: [finance.yahoo.com plans](https://finance.yahoo.com/about/plans/select-plan/), [bullishbears review](https://bullishbears.com/yahoo-finance-premium-review/) | Limited sharing; community features partly via prior Commonstock DNA (see below) | Yahoo Finance message boards / community at scale | Export / research tools on Gold; **agent-native API for consumer Pro: not a primary pitch** | Trusted brand; portfolio+news; Bronze lands near $10 | Data/research monetization, not developer multiplayer notes; no CLI/agent skill story |
| **Seeking Alpha Premium / Pro** | Fundamental long-term investors | Basic free articles limited | Premium: intro **$4.95** first month then **$299/yr** (list); Pro: **$99** first month then **$2,400/yr**. Sources: [seekingalpha.com/subscriptions](https://seekingalpha.com/subscriptions), [help.seekingalpha.com Premium](https://help.seekingalpha.com/what-is-seeking-alpha-premium), [stockbrokers.com](https://www.stockbrokers.com/review/tools/seeking-alpha) | Commenting on articles; not multi-role watchlist ACL | Author/community content economy | Research tools + AI features inside Premium; **open agent API for watchlists: unknown / not core** | Deep research moat | Wrong ICP for teemtape; 3–25× teemtape’s proposed $100/yr |
| **Finviz Elite** | US equity screeners / technical scanners | Free delayed quotes + basic screener | Monthly **$39.50**; annual **$299.50** (~**$24.96/mo**). Source: [finviz.com/elite](https://finviz.com/elite/) | Personal portfolios; not team ACL | Weak vs social platforms | **Export** marketed for automated workflows / AI agents | Screener + real-time + export for agents | No shared commenting product; agent story = CSV/API export, not collaborative annotation |
| **Koyfin** | Serious retail analysts + advisors | Free research lite | Plus **$39/mo**, Premium **$79/mo**, Advisor Core **$209/mo**, Advisor Pro **$299/mo** (page shows these figures; annual toggle exists but **exact annual USD not confirmed in fetch**). Source: [koyfin.com/pricing/plans-comparison](https://www.koyfin.com/pricing/plans-comparison/), [koyfin pricing LLM guide](https://www.koyfin.com/pricing-llm-info/) | Teams option (custom) | Low | Professional data workflows | Institutional-grade analytics | Far above $10; advisor ICP, not indie hacker watchlist notes |
| **Simply Wall St** | Visual fundamental retail | Free: limited reports, 1 portfolio / 10 holdings, 3 watchlists | Secondary USD: Premium **$15.99/mo** or **$131.40/yr**; Unlimited **$258/yr**. Official [plans](https://simplywall.st/plans) is feature-table heavy; **USD often client-rendered** — verify at checkout. Source: [toolchase Simply Wall St 2026](https://toolchase.com/tool/simplywallst/) | Shareable portfolios | Community Narratives | Charlie AI on paid; export on Unlimited | Close price neighbor to $10–$15 | Portfolio/narrative product, not agent+human shared list |
| **Commonstock** (acquired) | Social retail with verified portfolios | Was free-ish social product | **N/A (standalone shut / absorbed)** | Broker-linked portfolio sharing, friend trade alerts | Social investing community | N/A | Proved demand for social + verified holdings | **Acquired by Yahoo Aug 2023**; standalone brand discontinued as independent app. Lesson: social investing hard to scale alone; incumbents buy the community layer. Sources: [Yahoo press](https://www.yahooinc.com/press/yahoo-acquires-commonstock-to-expand-community-deepen-insights-for-yahoo-finance-users), [Axios](https://www.axios.com/2023/08/23/commonstock-yahoo-social-investing-platform) |
| **Discord / Telegram paid trading communities** | Signal seekers / discretionary traders | Free servers (noise) | Typical paid rooms often **~$29–$200/mo**; premium signal rooms often **~$79–$149**; high-touch **$200–$500**. **Wide variance — treat as ranges, not a sticker price.** Monthly churn often cited **~7–10%** for ordinary paid Discords (better ~3–5% with strong ops). Sources: [shipworkflow Discord income 2026](https://shipworkflow.com/blog/how-much-do-paid-discord-communities-make), [doorfee analytics](https://doorfee.io/blog/discord-server-analytics-revenue-growth), [purepowerpicks options Discords](https://purepowerpicks.com/best-options-trading-community-discord-groups/) | High (chat + roles) | **The product is the community** | Bots / webhooks common; not structured watchlist ACL | Engagement + FOMO | High churn; advice/signal regulatory risk; opposite of teemtape’s “not advice” posture; poor fit as *core* Pro value |
| **Substack finance paid / community tiers** | Newsletter audiences | Free posts | Common paid newsletters **~$8–$20/mo** or **~$80–$200/yr**; community/access tiers often **~$13–$29/mo**; some Pro (e.g. Doomberg-style) much higher (**hundreds–$1,200/yr** cited in secondary pieces — **verify per publication**). Sources: [inboxalchemy paid newsletter pricing](https://inboxalchemy.co/blog/paid-newsletter-pricing), [wolf.financial Substack vs Patreon](https://wolf.financial/blog/substack-vs-patreon-premium-community-monetization) | Chat / private posts / calls depending on creator | Creator community | Rarely agent-native | Proven willingness to pay for *access + writing* | Monetizes audience/trust, not a multiplayer OSS tool; Founder $1000 closer to “creator Pro” than SaaS seat |
| **Perplexity Finance** | Retail + research with AI Q&A | Finance browsing / watchlists largely free (account for saves/alerts) | Perplexity Pro commonly **$20/mo** (Max higher, often **$200/mo** cited). Finance portfolio via Plaid read-only. Sources: [perplexity.ai/finance](https://www.perplexity.ai/finance), [perplexity.ai/finance/portfolio](https://www.perplexity.ai/finance/portfolio), secondary Pro pricing roundups | Personal portfolios/watchlists | Weak | Strong AI research; Agent API `finance_search` for builders | Agent-adjacent research UX | Not multi-user permissioned lists; competes for “ask AI about tickers” mindshare |
| **ChatGPT (Plus / agent workflows)** | General knowledge workers + builders | Free tier | Plus commonly **$20/mo** (OpenAI plan page). Sources: [openai.com/ChatGPT/pricing](https://openai.com/ChatGPT/pricing) | Custom GPTs / projects shared ad hoc | Weak | **Strongest general agent runtime**; user brings tools/MCP | Default place agents live | No durable shared ticker annotation product; teemtape must be the *state layer* agents write into |
| **MCP / OSS finance agent tools** (Alpha Vantage MCP, stock-scanner-mcp, etc.) | Developers wiring Claude/Cursor agents | Mostly free OSS; data APIs have their own keys/limits | Data vendor keys vary (Alpha Vantage free+paid — **confirm current tiers**); MCP servers typically $0 | Local/shared via user’s infra | Dev community | **Native agent access** | Closest tech analogy to teemtape CLI/skill | Fragmented; no hosted multiplayer permissions; teemtape Pro can be the hosted source-of-truth on top |
| **teemtape (proposed Pro)** | Devs / indie hackers / AI-tooling users who annotate tickers | Free anonymous URL-token watchlist + self-host | Proposed: **$10/mo**, **$100/yr**, Founder **$1000** lifetime | Owner/editor/commenter/viewer; invite collaborators (collaborators don’t pay) | Optional “club” undefined | CLI + AI-agent skill (differentiation) | Unique: human+agent same list; OSS free forever self-host | Pre-PMF; delayed data; no charts/research moat; must sell workflow not data |

---

## 2. Where $10 / $100 / $1000 sit

### $10/mo
| Segment | Fit | Why |
| --- | --- | --- |
| **Developer / AI tooling (teemtape ICP)** | **Right-to-slightly-high** until value proven | Same band as Plausible-style indie SaaS entry, Obsidian Sync (~$4–5), Yahoo Bronze (~$10), Simply Wall St Premium monthly (~$16). Devs pay $10–$20 easily for tools that save time *if* habit exists. **Risk:** free anonymous URL already does the core job → WTP collapses unless Pro unlocks *account permanence + permissions + agent auth*. |
| **Retail traders** | **Low / cheap** | TradingView Essential alone is ~$15; Stocktwits Edge ~$23; Finviz ~$25–40. They are used to paying for *data/charts*, not $10 for notes. But they also won’t pay $10 for teemtape if it lacks data edge. |
| **Serious research subscribers** | **Irrelevant / too cheap to signal** | SA Premium $299/yr buyers aren’t shopping $10 tools for research. |

**Verdict:** $10/mo is **market-plausible for the stated ICP**, not “too low to be credible,” but **not justified by feature parity with finance SaaS** — only by workflow lock-in (permissions + agents + multiple lists).

### $100/yr (~17% off vs $120)
| Segment | Fit | Why |
| --- | --- | --- |
| Indie SaaS norms | **Right** | “2 months free” (~16.7%) is the textbook annual gap; Yahoo uses ~20%; TradingView often ~13–17% by tier. |
| Finance SaaS | **Low absolute** | Competitors’ annual tickets are $95 (Yahoo Bronze) to $229–$299 (Stocktwits Edge / Finviz / SA). teemtape at $100 is **cheap for finance**, **normal for indie tool**. |
| Annual mix expectation | See H6 — **don’t expect >~40–50% annual** without annual-default UX and a clear reason to commit. |

**Verdict:** Gap size is **fine**. Absolute annual price is **not the bottleneck**; conversion will be.

### $1000 lifetime Founder
| Segment | Fit | Why |
| --- | --- | --- |
| Dev/OSS patrons | **Aggressive but in the known playbook** | Obsidian Catalyst is only $25–$100 one-time (support + badge, not Pro forever). Tailwind UI early was ~$149–$249 with huge audience. $1000 is **~8.3 years of $10/mo** or **10 years of $100/yr** — needs **status + access + belief**, not math of “lifetime SaaS discount.” |
| Retail “trader club” buyers | **Comparable to 2–6 months of expensive Discord** or a year of SA Pro-adjacent spend — but **expectation mismatch** if they expect signals/P&L. |
| AppSumo LTD shoppers | Different market (often $39–$179 LTDs) — **don’t conflate**. |

**Verdict:** $1000 is **not comparable to competitor SaaS tiers**; it is a **patron / founder / sponsorware** price. Sellable only with **credible community + clear perks + scarcity**. Without that, it is too high.

---

## 3. Hypotheses H1–H6 (evidence-based)

### H1: Segment will pay ~$10/mo for private/permissioned shared watchlists with notes
**Lean: UNCLEAR → weak hold only if Pro is more than “save my free list”**

**Evidence for:**
- Finance products monetize portfolios/watchlists at $8–$40/mo (Yahoo Bronze, Simply Wall St, TradingView Essential).
- Collaboration SaaS broadly monetizes permissions (Notion/Linear/etc. — different category, but buyers understand ACL).
- Free anonymous URL is great UX but weak for *teams* (token leak = full access; no roles).

**Evidence against:**
- teemtape free already covers solo/anonymous use — classic freemium trap.
- Closest social competitors either failed as standalone (Commonstock → Yahoo) or monetize **content/data**, not ACL.
- Current audience is **devs**, who already use GitHub issues, Notion, Discord, Google Sheets for notes — switching cost exists.

**Implication:** H1 holds only if messaging is **“multiplayer + roles + permanent identity for humans and agents”**, not “private watchlist.”

### H2: AI-agent angle is a stronger reason to pay than collaboration for developer/AI segment
**Lean: HOLD (for *this* ICP)**

**Evidence for:**
- ICP is developers/AI tooling; MCP/skills are a live purchasing mood (Alpha Vantage MCP, stock-scanner-mcp, Perplexity Agent finance tools).
- Finviz explicitly markets Elite export for “Automated Workflow / AI Agents” ([finviz.com/elite](https://finviz.com/elite/)).
- ChatGPT/Perplexity at ~$20/mo set willingness to pay for agent capability; teemtape can be cheaper *state* layer.
- Collaboration alone overlaps Sheets/Notion; **agent-writable structured ticker state** is rarer.

**Evidence against:**
- Agent tooling churns fast; “skill” may be novelty.
- Many agents can already hit free Yahoo/public APIs without paying teemtape.
- Collaboration still needed for *human* accountability on notes.

**Implication:** Lead with **agent + CLI as Pro hook**; keep permissions as the trust/safety layer agents need (scoped tokens, roles). Don’t sell “Discord for stocks.”

### H3: $1000 lifetime Founder can sell 20–50 units in 90 days if community credible
**Lean: UNCLEAR — possible only with warm audience; default NO without proof of reach**

**Evidence for:**
- Sponsorware / founder launches with existing audiences have sold out small caps (Porzio Sushi sponsorware: 23→75 sponsors in ~2 days; Tailwind UI: hundreds of $k in days — **both had large followings**).
- Indie “first 100” LTD caps are common and can work when scarcity is real.

**Evidence against:**
- 20–50 × $1000 = **$20k–$50k**. Requires either (a) highly engaged list or (b) breakout HN/X moment.
- Early / pre-PMF product + undefined “trader club” weakens offer.
- Obsidian-style patrons pay **$25–$100**, not $1000, for recognition-heavy tiers.

**Implication:** Treat 20–50 as an **upside case**, not the plan. Pre-sell with refundable deposit or “Founder when Pro ships” only after measuring waitlist conversion. Cap inventory (e.g. 50 or 100) *if* you have demand signal.

### H4: Founder buyers value public recognition ~as much as lifetime access
**Lean: HOLD for OSS/dev buyers; DOES NOT HOLD for retail**

**Evidence for:**
- Obsidian Catalyst: badges + insider channels are the product ([obsidian.md/pricing](https://obsidian.md/pricing)).
- Porzio sponsorware: logo-in-docs tiers mattered ([calebporzio.com/sponsorware](https://calebporzio.com/sponsorware)).
- GitHub README sponsors sections / SPONSORS.md are cultural norms in OSS.

**Evidence against:**
- $1000 is high for *only* a README shoutout; recognition is **amplifier**, not sole justification.
- Retail Discord buyers want **signals/access**, not GitHub fame.

**Implication:** Bundle **lifetime Pro + visible sponsor listing + private channel with defined value**. Recognition ≈ 30–40% of perceived value for ICP; lifetime access ≈ 40–50%; club must not be vapor.

### H5: Free product is a sufficient funnel vs need separate acquisition
**Lean: DOES NOT HOLD for v1 paid goals — free is necessary but not sufficient**

**Evidence for:**
- OSS + anonymous URL is an excellent top-of-funnel for *devs* (GitHub, HN, CLI discovery).
- Self-host free / hosted paid is a proven Plausible/Ghost-shaped story.

**Evidence against:**
- Pre-PMF + early usage ⇒ free funnel may be tiny.
- Commonstock needed Yahoo’s distribution.
- Retail finance paid products spend heavily on content/SEO; teemtape won’t get that for free.

**Implication:** Free is the right **activation** path for ICP. For first 100 payers, still need **deliberate GTM** (GitHub README, X/dev, HN Show, AI community posts, skill directories). Separate *retail* channels not required for v1 **if** ICP stays developers.

### H6: $100/yr (17% off) is the right annual gap; bigger discount wouldn’t move annual share materially
**Lean: HOLD on gap size; UNCLEAR on “bigger discount wouldn’t move share”**

**Evidence for:**
- 2 months free (~16.7%) and ~20% annual discounts are industry-standard (Yahoo 20%; TradingView ~13–17%; Plausible “save 2 months” yearly).
- ChartMogul / SaaS billing commentary: annual often ~40–50% of ARR mix at scale; median annual discount often ~15–20% (secondary benchmarks — treat as directional).

**Evidence against:**
- Some products use 30–40% off or “3 months free” to force annual; effect is real on *presentation*, not only on discount math.
- For a $10 product, absolute savings of $20/yr is small — **UX default (annual highlighted)** moves mix more than cutting to $80/yr.

**Implication:** Keep **$100/yr**. Don’t spend engineering cycles on exotic annual pricing. Prefer annual-default on checkout. Bigger discounts unlikely to be the main lever vs positioning/value.

---

## 4. Packaging answers (competitor-informed)

| Question | Lean | Competitor pattern |
| --- | --- | --- |
| Free signed-in vs Pro-only accounts | **Free signed-in with 1 saved list** | Yahoo/TradingView/Simply Wall St all allow free accounts; Pro upgrades capacity/permissions. Forcing account-only-on-pay hurts agent onboarding & funnel. |
| Collaborators don’t pay vs seats | **Collaborators free (owner pays)** for v1 | Matches “invite your friends” viral; Discord bots often gate the *server owner*. Seat models (Koyfin Teams, Obsidian Sync per user) fit later if orgs appear. |
| Monthly vs annual mix | Expect **majority monthly early**; annual rises with trust | Early SaaS skews monthly; finance tools push annual hard with trials. |
| Agent/API vs permissions as Pro hook | **Agent/API + authz together**; marketing lead = agent | Finviz sells export/automation; TradingView sells webhooks on mid tiers; ACL alone is table stakes for “Pro.” |

---

## 5. Price-position map (schematic)

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

## 6. Honest gaps / unknowns

- **TradingView exact USD on official page:** geo-dependent; confirm before quoting in customer-facing copy.
- **Simply Wall St USD on marketing page:** often JS/region-specific; secondary USD used above.
- **Koyfin annual exact totals:** monthly list prices confirmed; annual invoice amounts not independently captured here.
- **Stocktwits Enterprise API pricing:** contact-sales; unknown.
- **Discord/Telegram “typical” prices:** ranges only; huge quality variance.
- **teemtape current conversion funnel metrics:** not provided — H1/H3/H5 remain partly untestable without usage data.
- **No primary survey of teemtape users’ WTP** in this research.

---

## 7. Sources (access date 2026-09-17)

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
18. https://shipworkflow.com/blog/how-much-do-paid-discord-communities-make  
19. https://doorfee.io/blog/discord-server-analytics-revenue-growth  
20. https://www.perplexity.ai/finance  
21. https://openai.com/ChatGPT/pricing  
22. https://calebporzio.com/sponsorware  
23. https://obsidian.md/pricing  
24. https://plausible.io/docs/subscription-plans  
