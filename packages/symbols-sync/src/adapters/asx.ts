import { parseCsv } from "../csv.js";
import { fetchText } from "../http.js";
import { canonicalSymbol, SCHEMA_ID, type SymbolRecord } from "../schema.js";
import type { Adapter } from "./types.js";

const URL = "https://www.asx.com.au/asx/research/ASXListedCompanies.csv";

/**
 * ASX listed companies CSV. The file starts with a free-text "as at" line
 * and a blank line before the header `Company name,ASX code,GICS industry group`.
 */
export const asx: Adapter = {
  id: "asx",
  market: "ASX",
  sourceUrl: URL,
  licence: "ASX publishes the listed-companies file for public download; company names/codes only (no prices).",
  fetch: () => fetchText(URL, { accept: "text/csv" }),
  parse(raw, syncedAt) {
    const rows = parseCsv(raw);
    const headerAt = rows.findIndex((r) => r[0]?.trim().toLowerCase() === "company name");
    if (headerAt < 0) throw new Error("asx: header row not found");
    const header = rows[headerAt]!.map((h) => h.trim().toLowerCase());
    const iName = header.indexOf("company name");
    const iCode = header.indexOf("asx code");
    if (iName < 0 || iCode < 0) throw new Error(`asx: unexpected header ${header.join(",")}`);

    const out: SymbolRecord[] = [];
    for (const row of rows.slice(headerAt + 1)) {
      const code = row[iCode]?.trim().toUpperCase();
      const name = row[iName]?.trim();
      if (!code || !name) continue;
      out.push({
        schema: SCHEMA_ID,
        symbol: canonicalSymbol(code, "AX"),
        base: code,
        suffix: "AX",
        mic: "XASX",
        exchangeCode: "ASX",
        currency: "AUD",
        country: "AU",
        name,
        isin: null,
        cik: null,
        source: "asx",
        syncedAt,
      });
    }
    return out;
  },
};
