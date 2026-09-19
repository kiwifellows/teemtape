-- Multi-market symbols catalog (docs/plans/multi-market.md).
--
-- `ticker` stays the primary key but now holds the *canonical* symbol:
-- bare for US listings ("AAPL"), Yahoo-style suffix elsewhere ("FPH.NZ",
-- "BHP.AX", "0700.HK"). Tickers collide across exchanges ("AMP" is NYSE
-- Ameriprise and ASX AMP Limited) so the suffix is part of the identity.
--
-- SQLite cannot relax NOT NULL in place (cik_str is SEC/US-only now), so the
-- table is rebuilt. Existing US rows are carried across with placeholder
-- venue metadata ("XXXX" is the ISO 10383 code for "no market") and get real
-- values on the next run of the symbols pipeline (packages/symbols-sync).

CREATE TABLE symbols_v2 (
  ticker        TEXT PRIMARY KEY,           -- canonical symbol, e.g. FPH.NZ
  base          TEXT NOT NULL,              -- exchange-local code, e.g. FPH
  suffix        TEXT NOT NULL DEFAULT '',   -- canonical suffix without dot; '' = US
  exchange_code TEXT NOT NULL,              -- short UI label: NASDAQ, NYSE, NZX, ASX …
  mic           TEXT NOT NULL,              -- ISO 10383 MIC of the venue, XXXX if unknown
  currency      TEXT NOT NULL,              -- ISO 4217
  country       TEXT NOT NULL,              -- ISO 3166-1 alpha-2
  title         TEXT NOT NULL,
  isin          TEXT,
  cik_str       INTEGER,                    -- SEC Central Index Key (US only)
  source        TEXT,                       -- adapter id that produced the row, e.g. sec, asx
  synced_at     TEXT NOT NULL               -- ISO 8601 batch marker for stale-row cleanup
);

INSERT INTO symbols_v2 (ticker, base, suffix, exchange_code, mic, currency, country, title, isin, cik_str, source, synced_at)
SELECT ticker, ticker, '', 'US', 'XXXX', 'USD', 'US', title, NULL, cik_str, 'sec', synced_at
  FROM symbols;

DROP TABLE symbols;
ALTER TABLE symbols_v2 RENAME TO symbols;

CREATE INDEX IF NOT EXISTS idx_symbols_title ON symbols (title);
CREATE INDEX IF NOT EXISTS idx_symbols_base ON symbols (base);
CREATE INDEX IF NOT EXISTS idx_symbols_exchange ON symbols (exchange_code, ticker);
CREATE INDEX IF NOT EXISTS idx_symbols_cik ON symbols (cik_str);
