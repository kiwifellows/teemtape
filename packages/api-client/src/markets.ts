/**
 * Market registry — the one place that knows which exchange a canonical
 * symbol belongs to.
 *
 * Canonical symbols are Yahoo-style `BASE[.SUFFIX]`: US listings are bare
 * (`AAPL`), every other market carries a mandatory suffix (`FPH.NZ`,
 * `BHP.AX`, `0700.HK`). Tickers are only unique per exchange (`AMP` is
 * Ameriprise on NYSE and AMP Limited on ASX), so the suffix is what keeps
 * notes and quotes attached to the right listing. See
 * docs/plans/multi-market.md.
 */

export interface Market {
  /** Short code used in the API, CLI and UI badges, e.g. "NZX". */
  code: string;
  /** Canonical-symbol suffix without the dot; "" for the US. */
  suffix: string;
  /** ISO 10383 operating MIC of the exchange; "" for the US (venue varies per row). */
  mic: string;
  /** ISO 4217 trading currency of listings on this market. */
  currency: string;
  /** ISO 3166-1 alpha-2 country. */
  country: string;
  /** Human name for docs and pickers. */
  name: string;
  /** Prefixes accepted in `EXCHANGE:TICKER` input (TradingView / Simply Wall St style). */
  aliases: readonly string[];
  /** Delay Yahoo Finance states for this exchange, in seconds (their help table). */
  yahooDelaySeconds: number;
}

export const MARKETS: readonly Market[] = [
  { code: "US", suffix: "", mic: "", currency: "USD", country: "US", name: "US (NYSE / Nasdaq / OTC)", aliases: ["US", "NYSE", "NASDAQ", "AMEX", "NYSEARCA", "BATS", "OTC"], yahooDelaySeconds: 0 },
  { code: "NZX", suffix: "NZ", mic: "XNZE", currency: "NZD", country: "NZ", name: "NZX Main Board", aliases: ["NZX", "NZSE", "NZ"], yahooDelaySeconds: 1200 },
  { code: "ASX", suffix: "AX", mic: "XASX", currency: "AUD", country: "AU", name: "Australian Securities Exchange", aliases: ["ASX", "AU", "AX"], yahooDelaySeconds: 1200 },
  { code: "SGX", suffix: "SI", mic: "XSES", currency: "SGD", country: "SG", name: "Singapore Exchange", aliases: ["SGX", "SG", "SI"], yahooDelaySeconds: 1200 },
  { code: "HKEX", suffix: "HK", mic: "XHKG", currency: "HKD", country: "HK", name: "Hong Kong Stock Exchange", aliases: ["HKEX", "HKG", "HK"], yahooDelaySeconds: 900 },
  { code: "TSE", suffix: "T", mic: "XJPX", currency: "JPY", country: "JP", name: "Tokyo Stock Exchange", aliases: ["TSE", "TYO", "JPX", "JP", "T"], yahooDelaySeconds: 1200 },
  { code: "LSE", suffix: "L", mic: "XLON", currency: "GBP", country: "GB", name: "London Stock Exchange", aliases: ["LSE", "LON", "UK", "GB", "L"], yahooDelaySeconds: 1200 },
  { code: "XETRA", suffix: "DE", mic: "XETR", currency: "EUR", country: "DE", name: "Deutsche Börse XETRA", aliases: ["XETRA", "XETR", "FRA", "DE"], yahooDelaySeconds: 900 },
  { code: "EPA", suffix: "PA", mic: "XPAR", currency: "EUR", country: "FR", name: "Euronext Paris", aliases: ["EPA", "EURONEXT", "PAR", "FR", "PA"], yahooDelaySeconds: 900 },
  { code: "AMS", suffix: "AS", mic: "XAMS", currency: "EUR", country: "NL", name: "Euronext Amsterdam", aliases: ["AMS", "NL", "AS"], yahooDelaySeconds: 900 },
  { code: "NSE", suffix: "NS", mic: "XNSE", currency: "INR", country: "IN", name: "National Stock Exchange of India", aliases: ["NSE", "NSI", "IN", "NS"], yahooDelaySeconds: 0 },
  { code: "BSE", suffix: "BO", mic: "XBOM", currency: "INR", country: "IN", name: "BSE (Bombay)", aliases: ["BSE", "BOM", "BO"], yahooDelaySeconds: 900 },
];

const BY_SUFFIX = new Map(MARKETS.map((m) => [m.suffix, m]));
const BY_ALIAS = new Map<string, Market>();
for (const m of MARKETS) {
  BY_ALIAS.set(m.code, m);
  for (const a of m.aliases) BY_ALIAS.set(a, m);
}

/** Look a market up by its short code (`"NZX"`), or by any alias. Case-insensitive. */
export function findMarket(codeOrAlias: string): Market | undefined {
  return BY_ALIAS.get(codeOrAlias.trim().toUpperCase());
}

/** Look a market up by canonical-symbol suffix (`"NZ"`); `""` is the US. */
export function marketForSuffix(suffix: string): Market | undefined {
  return BY_SUFFIX.get(suffix.toUpperCase());
}

/** Split a canonical symbol into `{ base, suffix, market }`; `market` is undefined for an unknown suffix. */
export function splitSymbol(symbol: string): { base: string; suffix: string; market: Market | undefined } {
  const upper = symbol.toUpperCase();
  const dot = upper.lastIndexOf(".");
  // US class shares look like "BRK.B": the part after the dot is not a known
  // suffix, so the whole thing is a US base symbol.
  if (dot > 0) {
    const suffix = upper.slice(dot + 1);
    const market = BY_SUFFIX.get(suffix);
    if (market && suffix !== "") return { base: upper.slice(0, dot), suffix, market };
  }
  return { base: upper, suffix: "", market: BY_SUFFIX.get("") };
}

/**
 * Normalise user / agent input into a canonical symbol string.
 *
 * Accepts `bhp.ax`, `ASX:BHP`, `nzx:fph` and returns `BHP.AX` / `FPH.NZ`;
 * `NASDAQ:AAPL` becomes `AAPL`. Does not validate the characters — callers
 * still run the result through their own symbol validation. Returns the
 * upper-cased, trimmed input unchanged when it is not in `EXCHANGE:TICKER`
 * form or the exchange is unknown.
 */
export function normalizeSymbol(input: string): string {
  const trimmed = input.trim().toUpperCase();
  const colon = trimmed.indexOf(":");
  if (colon <= 0) return trimmed;
  const market = findMarket(trimmed.slice(0, colon));
  const base = trimmed.slice(colon + 1).trim();
  if (!market || !base) return trimmed;
  return market.suffix ? `${base}.${market.suffix}` : base;
}
