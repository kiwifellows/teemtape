-- SEC company ticker reference data (synced by workers/symbols-sync).

CREATE TABLE IF NOT EXISTS symbols (
  ticker     TEXT PRIMARY KEY,
  cik_str    INTEGER NOT NULL,
  title      TEXT NOT NULL,
  synced_at  TEXT NOT NULL                -- ISO 8601 batch marker for sync cleanup
);

CREATE INDEX IF NOT EXISTS idx_symbols_cik ON symbols (cik_str);
CREATE INDEX IF NOT EXISTS idx_symbols_title ON symbols (title);
