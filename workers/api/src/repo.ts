import type { CreateNoteInput, Note, Watchlist } from "@teemtape/api-client";
import type { Env } from "./env.js";
import { HttpError } from "./http.js";
import { authorFor, newNoteId, newWatchlistToken } from "./ids.js";

/** Create a new anonymous watchlist and return it. */
export async function createWatchlist(env: Env): Promise<Watchlist> {
  const token = newWatchlistToken();
  const createdAt = new Date().toISOString();
  await env.DB.prepare("INSERT INTO watchlist (token, created_at) VALUES (?1, ?2)")
    .bind(token, createdAt)
    .run();
  return { token, symbols: [], createdAt };
}

/** Throw 404 if the watchlist token does not exist; return its created_at. */
async function requireWatchlist(env: Env, token: string): Promise<string> {
  const row = await env.DB.prepare("SELECT created_at FROM watchlist WHERE token = ?1")
    .bind(token)
    .first<{ created_at: string }>();
  if (!row) throw new HttpError(404, "unknown watchlist token");
  return row.created_at;
}

async function listSymbols(env: Env, token: string): Promise<string[]> {
  const res = await env.DB.prepare(
    "SELECT symbol FROM watchlist_symbol WHERE token = ?1 ORDER BY added_at ASC",
  )
    .bind(token)
    .all<{ symbol: string }>();
  return res.results.map((r) => r.symbol);
}

/** Fetch a watchlist (symbols + metadata) by token. */
export async function getWatchlist(env: Env, token: string): Promise<Watchlist> {
  const createdAt = await requireWatchlist(env, token);
  const symbols = await listSymbols(env, token);
  return { token, symbols, createdAt };
}

/** Add a symbol to a watchlist (idempotent). */
export async function addSymbol(env: Env, token: string, symbol: string): Promise<Watchlist> {
  await requireWatchlist(env, token);
  await env.DB.prepare(
    "INSERT OR IGNORE INTO watchlist_symbol (token, symbol, added_at) VALUES (?1, ?2, ?3)",
  )
    .bind(token, symbol, new Date().toISOString())
    .run();
  return getWatchlist(env, token);
}

/** Notes for a (watchlist, symbol), newest first. */
export async function getNotes(env: Env, token: string, symbol: string): Promise<Note[]> {
  await requireWatchlist(env, token);
  const res = await env.DB.prepare(
    `SELECT id, symbol, author, source, body, created_at AS createdAt
       FROM note
      WHERE token = ?1 AND symbol = ?2
      ORDER BY created_at DESC`,
  )
    .bind(token, symbol)
    .all<Note>();
  return res.results;
}

/** Insert an anonymous note and return it. */
export async function addNote(env: Env, token: string, input: CreateNoteInput): Promise<Note> {
  await requireWatchlist(env, token);
  const note: Note = {
    id: newNoteId(),
    symbol: input.symbol,
    author: authorFor(input.source, token),
    source: input.source,
    body: input.body,
    createdAt: new Date().toISOString(),
  };
  await env.DB.prepare(
    `INSERT INTO note (id, token, symbol, author, source, body, created_at)
     VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)`,
  )
    .bind(note.id, token, note.symbol, note.author, note.source, note.body, note.createdAt)
    .run();
  return note;
}
