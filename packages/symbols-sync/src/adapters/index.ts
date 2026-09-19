import { asx } from "./asx.js";
import { nse } from "./nse.js";
import { nzx } from "./nzx.js";
import { sec } from "./sec.js";
import type { Adapter } from "./types.js";

/**
 * Adapters by market code. Markets in the shared registry without an adapter
 * here (SGX, HKEX, TSE, LSE, XETRA, Euronext, BSE) are accepted as symbols
 * everywhere but are not yet searchable — see docs/plans/multi-market.md for
 * the source each one needs.
 */
export const ADAPTERS: ReadonlyMap<string, Adapter> = new Map([sec, nzx, asx, nse].map((a) => [a.market, a]));

export type { Adapter } from "./types.js";
