import { validateRecord, type SymbolRecord } from "./schema.js";

/** Serialise records as NDJSON (one JSON object per line, trailing newline). */
export function toNdjson(records: readonly SymbolRecord[]): string {
  return records.map((r) => JSON.stringify(r)).join("\n") + (records.length ? "\n" : "");
}

export interface ParseResult {
  records: SymbolRecord[];
  /** 1-based line numbers with their problems; empty when the file is clean. */
  errors: Array<{ line: number; problems: string[] }>;
}

/** Parse NDJSON, validating every line against teemtape.symbol.v1. Blank lines are ignored. */
export function parseNdjson(text: string): ParseResult {
  const records: SymbolRecord[] = [];
  const errors: ParseResult["errors"] = [];
  const lines = text.split("\n");
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i]?.trim();
    if (!line) continue;
    let parsed: unknown;
    try {
      parsed = JSON.parse(line);
    } catch {
      errors.push({ line: i + 1, problems: ["invalid JSON"] });
      continue;
    }
    const problems = validateRecord(parsed);
    if (problems.length) errors.push({ line: i + 1, problems });
    else records.push(parsed as SymbolRecord);
  }
  return { records, errors };
}
