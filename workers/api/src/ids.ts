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

/**
 * Suggest a fresh, friendly anonymous handle, e.g. "user4821". Uniqueness is not
 * guaranteed here — the caller claims it against the `handle` table and retries
 * on collision (see repo.createHandle).
 */
export function suggestHandle(): string {
  const n = 1000 + Math.floor(Math.random() * 9000);
  return `user${n}`;
}

/**
 * Author handle for a note. A caller-supplied anonymous handle wins; otherwise we
 * fall back to a label derived from the source/token (backwards compatible).
 */
export function authorFor(source: "web" | "cli", token: string, handle?: string): string {
  if (handle) return handle;
  if (source === "cli") return "agent-cli";
  // Derive a short, stable-ish anonymous handle from the watchlist token.
  return `anon-${token.slice(0, 6)}`;
}
