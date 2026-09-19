import type { SymbolRecord } from "../schema.js";

/**
 * One adapter per source. `fetch` downloads the raw listing; `parse` turns
 * it into records, kept separate so tests run on fixtures with no network.
 * Adapters must only use sources whose terms allow republishing the list of
 * listed securities (exchange / regulator publications) — never a data
 * vendor's catalogue. Quotes are a separate concern and never flow through
 * this pipeline.
 */
export interface Adapter {
  /** Adapter id, also the `source` field on records. */
  id: string;
  /** Market code from the shared registry (`US`, `NZX`, `ASX`, `NSE`). */
  market: string;
  /** Where the listing comes from, for the docs and the CLI. */
  sourceUrl: string;
  /** One line on why we may republish it. */
  licence: string;
  fetch(): Promise<string>;
  parse(raw: string, syncedAt: string): SymbolRecord[];
}
