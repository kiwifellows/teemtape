import { parseCsv } from "../csv.js";
import { fetchText } from "../http.js";
import { canonicalSymbol, SCHEMA_ID, type SymbolRecord } from "../schema.js";
import type { Adapter } from "./types.js";

const URL = "https://archives.nseindia.com/content/equities/EQUITY_L.csv";

/**
 * NSE India equity master (EQUITY_L.csv). Header columns carry stray
 * leading spaces (" SERIES", " ISIN NUMBER") so lookups are trimmed. Only the
 * `EQ` series (ordinary equity) is imported; `BE`/`SM` etc. are trade-for-trade
 * or SME boards.
 */
export const nse: Adapter = {
  id: "nse",
  market: "NSE",
  sourceUrl: URL,
  licence: "NSE publishes the equity master list on its public archives site; names/codes/ISINs only.",
  fetch: () => fetchText(URL, { accept: "text/csv" }),
  parse(raw, syncedAt) {
    const rows = parseCsv(raw);
    const header = (rows[0] ?? []).map((h) => h.trim().toUpperCase());
    const col = (name: string): number => {
      const i = header.indexOf(name);
      if (i < 0) throw new Error(`nse: column ${name} missing from ${header.join(",")}`);
      return i;
    };
    const [iSymbol, iName, iSeries, iIsin] = [col("SYMBOL"), col("NAME OF COMPANY"), col("SERIES"), col("ISIN NUMBER")];

    const out: SymbolRecord[] = [];
    for (const row of rows.slice(1)) {
      const code = row[iSymbol]?.trim().toUpperCase();
      const name = row[iName]?.trim();
      if (!code || !name || row[iSeries]?.trim().toUpperCase() !== "EQ") continue;
      const isin = row[iIsin]?.trim().toUpperCase() || null;
      out.push({
        schema: SCHEMA_ID,
        symbol: canonicalSymbol(code, "NS"),
        base: code,
        suffix: "NS",
        mic: "XNSE",
        exchangeCode: "NSE",
        currency: "INR",
        country: "IN",
        name,
        isin,
        cik: null,
        source: "nse",
        syncedAt,
      });
    }
    return out;
  },
};
