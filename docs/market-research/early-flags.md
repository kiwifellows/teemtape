# teemtape Pro — Early Sanity Check (1 page)

**For:** Founder / solo maintainer  
**Access date:** 2026-09-17  
**Tone:** Blunt. Not financial or legal advice.  
**Full notes:** `competitors.md`, `founder-and-club.md`

---

## LEAN: **GO-WITH-CHANGES**

Build hosted Pro — but **do not** spend the full 8–10 weeks on a vague “trader club,” seat billing, or retail-trader feature parity. Ship the smallest Pro that makes **humans + agents** share a permissioned watchlist. Kill or rename the club until you have payers.

---

## H1–H6 scorecard

| # | Hypothesis | Lean | One-liner evidence |
| --- | --- | --- | --- |
| **H1** | Devs pay ~$10/mo for private/permissioned shared lists + notes | **Unclear → weak hold** | $10 is in-band (Yahoo Bronze, indie SaaS) but free URL already does solo; pay only if ACL + identity + multi-list are painful to fake |
| **H2** | AI-agent angle > collaboration for this ICP | **Hold** | ICP is AI/dev; Finviz sells export-for-agents; ChatGPT/Perplexity normalize ~$20 tool spend; Sheets already covers human collab |
| **H3** | $1000 Founder sells 20–50 in 90 days if community credible | **Unclear / optimistic** | Needs warm audience (Porzio/Tailwind-class). Pre-PMF default forecast: **single digits** until proven |
| **H4** | Founder buyers value recognition ≈ lifetime access | **Hold for ICP** | Catalyst/sponsorware; at $1000 recognition is necessary but not sufficient |
| **H5** | Free product alone is enough funnel | **Does not hold** | Free is right activation; first 100 payers still need deliberate GitHub/X/HN/AI GTM |
| **H6** | $100/yr (17% off) right; bigger discount won’t move mix much | **Hold on gap** | 2 mo free is standard; checkout default matters more than cutting to $80 |

---

## Quick take: $10 / $100 / $1000

| Price | Verdict | Blunt note |
| --- | --- | --- |
| **$10/mo** | **Keep** | Right pocket for indie/dev tools. Not “finance SaaS expensive,” not “too cheap to trust.” |
| **$100/yr** | **Keep** | ~17% off is fine. Don’t bike-shed. |
| **$1000 Founder** | **Defer or shrink** | Sell only after Pro works *or* as capped pre-sell with refund. Undefined club makes this SKU radioactive. Cap ≤50 if you launch it. |

---

## Top risks that should change the eng plan

1. **Freemium trap:** Anonymous URL remains “good enough” → Pro conversion ~0. **Mitigation:** Free signed-in = **1 saved list**; Pro = multi-list + roles + agent API keys / higher limits. Don’t lock *all* accounts behind paywall.
2. **Wrong MVP:** Building Discord-like community before ACL + agent auth. **Cut club from v1 eng.**
3. **Advice optics:** “Trader club” + US users + NZ entity. Even with disclaimers, picks/chat can create FAP/adviser-shaped risk (**research note — get counsel**). **Rename; moderate; no picks.**
4. **Lifetime hosted liability:** $1000 Forever × agent abuse = margin bomb. **Fair-use + rate limits in ToS from day one.**
5. **8–10 weeks solo:** Permissions + invites + billing + dashboard is already the whole budget. **No real-time data, no seats matrix, no polished club.**
6. **Acquisition fantasy:** Waiting for organic free→paid without Show HN / skill directory / Twitter demos. **Schedule launch content in the eng plan.**

---

## Packaging leans (specific)

| Topic | Lean |
| --- | --- |
| Free signed-in vs Pro-only accounts | **Free signed-in, 1 list.** Pro-only accounts choke agents and funnel. |
| Collaborators don’t pay vs seats | **Owner pays; collaborators free** for v1. Revisit seats only if teams appear. |
| Monthly vs annual | Offer both; **highlight annual**. Expect early mix monthly-heavy. |
| Agent/API vs permissions as hook | **Market agent/CLI**; ship permissions as the trust layer agents require. |

---

## D1–D7 recommendations

| ID | Decision | Lean |
| --- | --- | --- |
| **D1** | Founder via Stripe vs GitHub Sponsors | **Stripe for $1000 Founder + Pro entitlement.** Optional GH Sponsors for small recurring tips. README lists both. Native GH badge is nice-to-have, not worth SKU contortions. |
| **D2** | What the “club” is | **Not a trader club.** If anything: **Founders’ Circle / Tape Room** = roadmap AMAs, agent recipes, no stock picks. Prefer **ship Pro with zero club**, add circle after 20+ paying Pros. |
| **D3** | Free signed-in 1 list | **Yes.** |
| **D4** | Prices / cap | **$10 / $100 keep.** Founder **$1000 optional**, cap **50**, sell after private beta *or* refundable pre-order. |
| **D5** | Pre-sell | **Soft yes:** waitlist + “notify when Pro opens.” Hard-charge Founder only with written v1 scope + refund policy. |
| **D6** | Name (product tier) | **teemtape Pro** (clear). Avoid “Elite/Edge/Premium” finance cosplay. |
| **D7** | Name (surface) | **“Dashboard” is OK but generic.** Prefer **teemtape Pro** / **app.teemtape.com** / **pro.teemtape.com**. Keep `dashboard.teemtape.com` if already wired — don’t burn cycles renaming. |

---

## GTM (first 100 payers)

**Stay on GitHub / dev X / HN / AI communities for v1. No retail channels required yet.**

1. **Show HN + README:** “OSS ticker tape humans and agents comment on — Pro adds roles + API keys.”  
2. **Agent demo clip:** Claude/Cursor skill posting a note to a shared list in 30 seconds.  
3. **Indie hacker angle:** “Anonymous watchlist URL was the wedge; Pro is how small teams stop leaking the token.”

---

## Naming

- **Tier:** `teemtape Pro` > Tape Pro > teemtape Plus.  
- **Founder:** `Founders’ Circle` not Trader Club.  
- **Dashboard:** Functional, not brand-defining — fine as subdomain; don’t lead marketing with “Dashboard.”

---

## Success criteria for the next 90 days (so this isn’t vibes)

- [ ] ≥1 free→signed-in conversion path live  
- [ ] Pro checkout ($10/$100) live before Founder  
- [ ] Public agent skill demo published  
- [ ] If Founder: written scope, fair-use, cap, refund — or don’t sell it  
- [ ] Zero marketing copy that implies trading signals or personalized advice  

**Bottom line:** GO on Pro workflow monetization; CHANGE the Founder/club packaging; DON’T expand into retail-trader SaaS in this eng slice.
