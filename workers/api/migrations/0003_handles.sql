-- Anonymous handles (lightweight identity, no accounts/sign-in).
--
-- A handle is a short, human-friendly name (e.g. "user1234") that a visitor or
-- agent picks once and reuses when posting notes, so collaborators on a shared
-- watchlist can tell each other apart. It is still anonymous by design: no
-- email, no password, no PII (see docs/architecture.md + security practices).
--
-- The table exists purely to guarantee global uniqueness ("never used before").
CREATE TABLE IF NOT EXISTS handle (
  handle      TEXT PRIMARY KEY,            -- normalized lowercase, globally unique
  created_at  TEXT NOT NULL                -- ISO 8601 timestamp
);
