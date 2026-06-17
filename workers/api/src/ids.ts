function randomHex(bytes: number): string {
  const buf = new Uint8Array(bytes);
  crypto.getRandomValues(buf);
  return [...buf].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Anonymous watchlist token: 32 hex chars (md5-shaped) from a cryptographically
 * random source. It is a bearer/capability identifier, so it must NOT be derived
 * from guessable input (see docs/practices/security.md).
 */
export function newWatchlistToken(): string {
  return randomHex(16);
}

/** Short unique id for a note. */
export function newNoteId(): string {
  return randomHex(8);
}

/** Author handle for a note based on its source. */
export function authorFor(source: "web" | "cli", token: string): string {
  if (source === "cli") return "agent-cli";
  // Derive a short, stable-ish anonymous handle from the watchlist token.
  return `anon-${token.slice(0, 6)}`;
}
