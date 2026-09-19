import { fetchText } from "../http.js";
import { canonicalSymbol, SCHEMA_ID, type SymbolRecord } from "../schema.js";
import type { Adapter } from "./types.js";

const URL = "https://www.nzx.com/markets/NZSX";

interface NzxInstrument {
  code?: string;
  name?: string;
  isin?: string;
  marketType?: string;
  securityClass?: string;
  type?: string;
  currencyCode?: string;
}

/** Instrument types on the NZSX board we treat as "a stock you can note on". */
const EQUITY_TYPES = new Set(["SHRS", "UNIT"]);

/**
 * NZX Main Board. NZX has no public CSV; its market page embeds the full
 * `activeInstruments` list in the Next.js `__NEXT_DATA__` payload (with ISIN
 * and currency). The parser walks that JSON for arrays of instruments rather
 * than hard-coding the query index, so a page re-shuffle doesn't break it.
 * Brittle by nature — if NZX ever publishes a file, switch to it.
 */
export const nzx: Adapter = {
  id: "nzx",
  market: "NZX",
  sourceUrl: URL,
  licence: "Listing codes/names as published on nzx.com's public market page; no prices are read.",
  fetch: () => fetchText(URL, { accept: "text/html" }),
  parse(raw, syncedAt) {
    const m = raw.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/);
    if (!m) throw new Error("nzx: __NEXT_DATA__ not found in page");
    const instruments = new Map<string, NzxInstrument>();
    collect(JSON.parse(m[1]!), instruments);
    if (instruments.size === 0) throw new Error("nzx: no NZSX instruments found in page data");

    const out: SymbolRecord[] = [];
    for (const inst of instruments.values()) {
      const code = inst.code!.trim().toUpperCase();
      out.push({
        schema: SCHEMA_ID,
        symbol: canonicalSymbol(code, "NZ"),
        base: code,
        suffix: "NZ",
        mic: "XNZE",
        exchangeCode: "NZX",
        currency: (inst.currencyCode ?? "NZD").toUpperCase(),
        country: "NZ",
        name: (inst.name ?? "").trim(),
        isin: inst.isin?.trim().toUpperCase() || null,
        cik: null,
        source: "nzx",
        syncedAt,
      });
    }
    return out;
  },
};

function collect(node: unknown, into: Map<string, NzxInstrument>): void {
  if (Array.isArray(node)) {
    for (const item of node) collect(item, into);
    return;
  }
  if (!node || typeof node !== "object") return;
  const obj = node as Record<string, unknown>;
  if (typeof obj.code === "string" && typeof obj.name === "string" && obj.marketType === "NZSX") {
    const inst = obj as NzxInstrument;
    if (inst.securityClass === "E" && EQUITY_TYPES.has(inst.type ?? "") && !into.has(inst.code!)) {
      into.set(inst.code!, inst);
    }
    return;
  }
  for (const value of Object.values(obj)) collect(value, into);
}
