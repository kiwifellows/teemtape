import { fetchText } from "../http.js";
import { canonicalSymbol, SCHEMA_ID, type SymbolRecord } from "../schema.js";
import type { Adapter } from "./types.js";

const URL = "https://www.sec.gov/files/company_tickers_exchange.json";

interface SecExchangeJson {
  fields: string[];
  data: Array<[number, string, string | null, string | null]>;
}

/** SEC exchange labels → listing-venue MIC + the short code shown in the UI. */
const VENUES: Record<string, { mic: string; code: string }> = {
  Nasdaq: { mic: "XNAS", code: "NASDAQ" },
  NYSE: { mic: "XNYS", code: "NYSE" },
  "NYSE MKT": { mic: "XASE", code: "NYSE American" },
  CBOE: { mic: "BATS", code: "CBOE" },
  OTC: { mic: "OTCM", code: "OTC" },
};

/**
 * US listings from the SEC's company_tickers_exchange.json. Includes the
 * listing venue (Nasdaq / NYSE / NYSE MKT / CBOE / OTC) and the CIK. Rows
 * with no ticker or no venue are skipped.
 */
export const sec: Adapter = {
  id: "sec",
  market: "US",
  sourceUrl: URL,
  licence: "US government work (public domain); SEC fair-access policy requires a descriptive User-Agent.",
  fetch: () => fetchText(URL, { accept: "application/json" }),
  parse(raw, syncedAt) {
    const data = JSON.parse(raw) as SecExchangeJson;
    const idx = (name: string): number => {
      const i = data.fields.indexOf(name);
      if (i < 0) throw new Error(`sec: field ${name} missing from ${data.fields.join(",")}`);
      return i;
    };
    const [iCik, iName, iTicker, iExchange] = [idx("cik"), idx("name"), idx("ticker"), idx("exchange")];
    const out: SymbolRecord[] = [];
    for (const row of data.data) {
      const ticker = String(row[iTicker] ?? "").trim().toUpperCase();
      const exchange = String(row[iExchange] ?? "").trim();
      const venue = VENUES[exchange];
      if (!ticker || !venue) continue;
      out.push({
        schema: SCHEMA_ID,
        symbol: canonicalSymbol(ticker, ""),
        base: ticker,
        suffix: "",
        mic: venue.mic,
        exchangeCode: venue.code,
        currency: "USD",
        country: "US",
        name: String(row[iName] ?? "").trim(),
        isin: null,
        cik: Number(row[iCik]),
        source: "sec",
        syncedAt,
      });
    }
    return out;
  },
};
