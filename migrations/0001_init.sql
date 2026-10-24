-- Everafter Studio MVP: one row per publicly available wedding website.
-- Never expose edit_token_hash in GET responses.
CREATE TABLE IF NOT EXISTS sites (
  slug TEXT PRIMARY KEY,
  data TEXT NOT NULL,
  edit_token_hash TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_sites_updated_at ON sites(updated_at);