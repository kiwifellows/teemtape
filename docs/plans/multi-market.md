# Multi-market symbols: canonical IDs, the ingestion pipeline, and rollout

> Status: **in progress** (M5 on the [roadmap](../roadmap.md)). Research behind
> this plan: the multi-market expansion brief in the private `teemtape-pro`
> repo (`docs/multi-market-expansion.md`, 2026-09-19). This document is the
> engineering record; keep it current as adapters land.

teemtape started US-only because its catalog came from one file (the SEC's
company tickers). The goal is NZX, ASX, SGX, HKEX, Tokyo, LSE, key EU venues
and India, without ever showing the wrong company's price next to a note.

## 1. The problem: tickers are only unique per exchange

| Bare code | What it is |
| --- | --- |
| `AMP` | Ameriprise Financial (NYSE) **and** AMP Limited (ASX) |
| `GME` | GameStop (NYSE) **and** GME Resources (ASX) — the Jan 2021 mistaken-identity spike |
| `CBA`, `ANZ` | Commonwealth Bank / ANZ on ASX; bare `CBA`/`ANZ` resolve to junk on Yahoo |
| `RIO` / `RIO.AX` / `RIO.L` | Same group, three listings, three currencies (USD / AUD / GBp) |
| `SAP` vs `SAP.DE`, `HSBC` vs `HSBA.L` | ADR vs primary listing |

A notes app that silently picked "the US one" would attach NZ/AU discussion
to the wrong instrument, so **identity must include the market**.

## 2. Canonical symbol scheme

- **Format:** Yahoo-style `BASE[.SUFFIX]`, upper-case. US listings are bare
  (`AAPL`, `BRK-B`); every other market has a mandatory suffix (`FPH.NZ`,
  `BHP.AX`, `0700.HK`, `7203.T`, `VOD.L`, `RELIANCE.NS`, `M&M.NS`).
- **Why Yahoo's spelling:** it is what people paste, what agents already
  know, URL-friendly, and it matches the OSS quote provider, so a catalog
  symbol is also a quote symbol with no mapping table.
- **Registry:** `packages/api-client/src/markets.ts` is the single table of
  suffix ↔ exchange code ↔ MIC ↔ currency ↔ country, shared by the Worker,
  CLI, web and the pipeline. Adding a market starts there.
- **Aliases accepted on input, never stored:** `ASX:BHP`, `nzx:fph`,
  `NASDAQ:AAPL` (TradingView / Simply Wall St style) normalise to
  `BHP.AX`, `FPH.NZ`, `AAPL` (`normalizeSymbol()`; the API applies it in
  `parseSymbol`).
- **Validation:** `^[A-Z0-9][A-Z0-9.&\-]{0,19}$` — leading digits (HK, JP),
  `&` (NSE) and 20 chars are allowed; a bare `AMP` is still valid input
  because it *is* the canonical US symbol.
- **Watchlists and notes store the canonical string only.** Nothing else in
  the public schema changed; existing US symbols are unchanged.
- **Collision UX:** search for `amp` returns both `AMP · NYSE · USD` and
  `AMP.AX · ASX · AUD`, exact-base matches first, with exchange and currency
  columns in the CLI table and a badge in the web dropdown. We never
  auto-resolve a bare code to a non-US market.

## 3. Where symbol data comes from (and where it must not)

The catalog is **names and codes only**, sourced from each exchange's or
regulator's own public listing publication. It never comes from a data
vendor's catalogue, and **nothing in the pipeline touches Yahoo Finance**.

| Market | Adapter | Source | Notes |
| --- | --- | --- | --- |
| US | `sec` | [SEC `company_tickers_exchange.json`](https://www.sec.gov/files/company_tickers_exchange.json) | Public domain; includes venue (Nasdaq/NYSE/NYSE MKT/CBOE/OTC) + CIK. SEC requires a `name email` User-Agent and 403s anything fancier. |
| NZX | `nzx` | [nzx.com/markets/NZSX](https://www.nzx.com/markets/NZSX) | No CSV published; the page embeds the full `activeInstruments` list (code, name, ISIN, currency) in its Next.js data. Shares + units only. Brittle by nature. |
| ASX | `asx` | [ASXListedCompanies.csv](https://www.asx.com.au/asx/research/ASXListedCompanies.csv) | Official public CSV, ~2 050 rows. |
| NSE India | `nse` | [EQUITY_L.csv](https://archives.nseindia.com/content/equities/EQUITY_L.csv) | Official equity master with ISIN; `EQ` series only. |
| SGX | — | `api.sgx.com` needs reverse-engineering; no public file found | Next |
| HKEX | — | [ListOfSecurities.xlsx](https://www.hkex.com.hk/eng/services/trading/securities/securitieslists/ListOfSecurities.xlsx) | Official, but xlsx → needs a parser dependency |
| Tokyo | — | JPX publishes an `.xls` under a changing URL | Same |
| LSE | — | LSE "instruments" report is an xlsx download behind a form | Same |
| XETRA / Euronext | — | Deutsche Börse `allTradableInstruments.csv`; Euronext CSV via POST | Verify terms |
| BSE India | — | bseindia.com blocks non-browser clients | Low priority; NSE covers most |

Each adapter carries its `sourceUrl` and a one-line `licence` note in code;
`teemtape-symbols markets` prints them.

### Quotes and Yahoo — the line we hold

- **OSS teemtape / self-host:** the Worker keeps fetching **delayed quotes**
  on demand from Yahoo's public chart endpoint (then Stooq / Polygon /
  sample), one symbol at a time on a KV-cache miss, exactly as before.
  Yahoo's help pages say not to redistribute their data; the OSS project
  accepts that as a community/dev risk **for quotes only**, documents it,
  and never bulk-stores or republishes Yahoo data. This pipeline does not
  change that exposure — `BHP.AX` already quoted before it was searchable.
- **Never from Yahoo:** the symbol catalog (this pipeline), any bulk quote
  snapshots, anything committed to the repo or uploaded to R2.
- **teemtape Pro / `app.teemtape.com`:** must not redistribute Yahoo-sourced
  prices. Pro stores only canonical symbol strings on lists/notes, tolerates
  `BASE.SUFFIX`, and gets prices from a licensed feed (or none) when it
  displays them. ASX public display additionally needs an exchange
  redistribution licence — a product gate, not an engineering one.
- **Delay honesty:** Yahoo's stated delay is 15–20 min for most non-US
  exchanges (registry `yahooDelaySeconds`); the UI's "~1 min" badge is
  US-centric and should become per-market (§6).

## 4. The pipeline (fetch anywhere → normalised NDJSON → import → serve)

```
teemtape-symbols fetch --market NZX --out out/NZX.ndjson     # exchange listing → teemtape.symbol.v1
wrangler d1 execute teemtape-db --remote --json \
  --command "SELECT ticker, base, suffix, exchange_code, mic, currency, country, title, isin, cik_str, source FROM symbols" \
  > out/current.json                                           # what D1 holds now (reads are cheap)
teemtape-symbols import out/*.ndjson --sql out/symbols.sql --current out/current.json
                                                              # validate, dedupe, render a DIFF: only changed rows written
wrangler d1 execute teemtape-db --remote --file out/symbols.sql
wrangler d1 execute … --json --command "SELECT …" > out/after.json  # the table as imported
teemtape-symbols snapshot out/after.json --out out/catalog.json     # teemtape.catalog.v1 serving snapshot
wrangler kv key put symbols:catalog:v1 --path out/catalog.json --binding QUOTES_CACHE --remote
```

- Lives in `packages/symbols-sync` (`@teemtape/symbols-sync`, private
  workspace; Node only, no Cloudflare runtime dependency). One adapter per
  source: `fetch()` downloads, `parse(raw, syncedAt)` normalises, so tests
  run on checked-in fixtures with no network.
- The Worker no longer syncs anything: the every-12-hours cron and
  `sync.ts` are gone. It only reads `symbols`.
- **`teemtape.symbol.v1`** (one NDJSON line per listing):

  ```json
  {"schema":"teemtape.symbol.v1","symbol":"FPH.NZ","base":"FPH","suffix":"NZ",
   "mic":"XNZE","exchangeCode":"NZX","currency":"NZD","country":"NZ",
   "name":"Fisher & Paykel Healthcare Corporation Limited Ord Shares",
   "isin":"NZFAPE0001S2","cik":null,"source":"nzx","syncedAt":"2026-09-19T01:08:02.735Z"}
  ```

  `symbol` must equal `base` + `.suffix`, the suffix must be in the
  registry, `mic` is 4 chars (`XXXX` = unknown), ISIN is checked for shape.
- **Collision rules in the importer:** two rows with the same canonical
  symbol are a plain duplicate unless both carry an ISIN and the ISINs
  differ — then the import **refuses** (exit 1, names the symbol) rather
  than guessing. Cross-market collisions (`AMP` vs `AMP.AX`) are distinct
  rows by construction.
- **Import is idempotent:** batched `INSERT … ON CONFLICT(ticker) DO UPDATE`
  (200 rows/statement) followed by `DELETE … WHERE suffix IN (<imported
  markets>) AND synced_at < <batch>` — delisted symbols disappear, and
  syncing only NZX never wipes the US rows.
- **Schema:** migration `0004_symbols_markets.sql` rebuilds `symbols` with
  `base, suffix, exchange_code, mic, currency, country, isin, cik_str (now
  nullable), source`. Existing US rows are kept with placeholder venue
  `XXXX` until the first pipeline run overwrites them.
- **Serving snapshot (`teemtape.catalog.v1`):** searching D1 with
  `LIKE '%q%'` scans the whole table twice per keystroke (~40k rows read
  per search on today's 14.7k listings — a few hundred searches a day is
  the Free plan's 5M-row read budget). So after each import the workflow
  exports the table once more and renders it as one JSON document of
  ticker-sorted column tuples `[ticker, exchange, mic, title, isin, cikStr]`
  (base/suffix/currency/country are derived from the ticker via the
  registry): **930 KB raw, ~235 KB gzipped for 14 740 rows**, parsed in
  ~6 ms. It is written to KV key `symbols:catalog:v1` (one KV write a
  fortnight); the Worker (`workers/api/src/catalog.ts`) loads it into memory
  once per isolate, re-reads it hourly, and answers `/api/symbols` from
  there with a one-hour edge cache — D1 is never read for search once the
  key exists, and is the fallback until it does. Adding SGX/HKEX/Tokyo/LSE
  should land around 24k rows / ~370 KB gzipped, still well within KV's
  25 MB value limit and the Worker's memory.
- **Artifacts:** the NDJSON, SQL and snapshot (plus a `.gz` copy for size
  checks) are uploaded as a 30-day GitHub Actions artifact on every run —
  the "normalised artifact" of the research, without paying for R2 until
  there is a reason to.

### Cadence: fortnightly or on demand — no always-on job

Listings change slowly, so `.github/workflows/sync-symbols.yml` runs on the
**1st and 15th of each month (03:00 UTC)** and via **Run workflow** with a
`markets` input (default `US,NZX,ASX,NSE`) and a `dry_run` switch that builds
and uploads the artifacts without touching D1 or KV. Uses the existing
`CLOUDFLARE_API_TOKEN` / `CLOUDFLARE_ACCOUNT_ID` secrets. Locally:

```bash
npm run build --workspace @teemtape/symbols-sync
node packages/symbols-sync/dist/cli.js fetch --market NZX --out out/NZX.ndjson
node packages/symbols-sync/dist/cli.js import out/*.ndjson --sql out/symbols.sql   # full rewrite is fine locally
cd workers/api && npx wrangler d1 execute teemtape-db --local --file ../../out/symbols.sql
```

First real run (2026-09-19, local D1): US 10 219 · ASX 2 046 · NSE 2 302 ·
NZX 173 = 14 740 rows; re-running is a no-op.

## 5. What shipped in the first PR

- Market registry + `normalizeSymbol` / `splitSymbol` in `@teemtape/api-client`;
  `SymbolEntry` gained `exchange, mic, currency, country, isin`, `cikStr` is
  nullable; `Quote` gained optional `currency` and `exchange` (Yahoo reports
  both; the web shows non-USD prices as `NZD 38.10`).
- Worker: migration 0004, wider `SYMBOL_RE`, alias normalisation,
  `GET /api/symbols?exchange=` filter, collision-first ordering, cron removed.
- `packages/symbols-sync` with `sec`, `nzx`, `asx`, `nse` adapters, NDJSON
  validation, dedupe/conflict detection, SQL renderer, CLI, fixture tests.
- `sync-symbols.yml` workflow (fortnightly + manual + dry run).
- CLI `search --exchange`, exchange/currency columns; web exchange badge;
  mock server `/api/symbols` with the `AMP` collision seeded.

## 6. Rollout (after this PR)

| Phase | Scope | Gate |
| --- | --- | --- |
| **A — turn it on** | Merge → deploy runs migration 0004 → run *Sync symbols catalog* by hand once (US placeholders get real venues; NZX/ASX/NSE appear in search). | — |
| **B — delay + currency UX** | Per-market delay badge from the registry instead of "~1 min"; currency on mobile cards; ambiguity picker in the web when a bare add matches >1 market. | — |
| **C — SGX, HKEX, Tokyo** | Adapters for `.SI`, `.HK`, `.T` (xlsx parsing for HKEX/JPX; find SGX's list). Numeric codes already validate. | Source terms checked |
| **D — LSE, XETRA, Euronext** | `.L`, `.DE`, `.PA`, `.AS` adapters; GBp (pence) display; Euronext allow-list. | Source terms checked |
| **E — BSE** | Only if NSE coverage proves insufficient. | — |
| **Pro** | Nothing here; Pro stores canonical strings and must use a licensed quote feed (ASX also needs a redistribution licence) before showing prices. | Licensing |

Open questions carried from the research: should notes on `RIO` and
`RIO.AX` ever thread together (ISIN grouping)? Default market when a user
types a bare code that matches several — always ask (current behaviour keeps
US, because bare *is* US).
