-- teemtape initial schema (D1 / SQLite).
-- See docs/architecture.md. Anonymous by design: no accounts, no PII.

-- A watchlist is identified by an anonymous token that lives in the share URL.
CREATE TABLE IF NOT EXISTS watchlist (
  token       TEXT PRIMARY KEY,            -- 32 hex chars (md5-shaped), crypto-random
  created_at  TEXT NOT NULL                -- ISO 8601 timestamp
);

-- Symbols belong to a watchlist (one row per symbol; simple + queryable).
CREATE TABLE IF NOT EXISTS watchlist_symbol (
  token       TEXT NOT NULL REFERENCES watchlist(token) ON DELETE CASCADE,
  symbol      TEXT NOT NULL,
  added_at    TEXT NOT NULL,
  PRIMARY KEY (token, symbol)
);

-- Anonymous notes attached to a (watchlist, symbol).
CREATE TABLE IF NOT EXISTS note (
  id          TEXT PRIMARY KEY,            -- short unique id
  token       TEXT NOT NULL REFERENCES watchlist(token) ON DELETE CASCADE,
  symbol      TEXT NOT NULL,
  author      TEXT NOT NULL,               -- anon-xxxxxx or agent-cli
  source      TEXT NOT NULL CHECK (source IN ('web', 'cli')),
  body        TEXT NOT NULL,
  created_at  TEXT NOT NULL
);

-- Primary read pattern: notes for a (token, symbol), newest first.
CREATE INDEX IF NOT EXISTS idx_note_token_symbol ON note (token, symbol, created_at);
