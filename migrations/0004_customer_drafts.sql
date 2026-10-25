-- Cloud-saved customer drafts and passwordless email sign-in.
-- Apply after migrations 0001–0003; no existing wedding site data is modified.
CREATE TABLE IF NOT EXISTS customer_login_codes (
  email TEXT PRIMARY KEY,
  code_hash TEXT NOT NULL,
  nonce TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  next_send_at INTEGER NOT NULL,
  sent_today INTEGER NOT NULL DEFAULT 1,
  day_bucket TEXT NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS customer_sessions (
  session_hash TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_customer_sessions_email ON customer_sessions(email);
CREATE TABLE IF NOT EXISTS customer_drafts (
  email TEXT PRIMARY KEY,
  data TEXT NOT NULL,
  last_step INTEGER NOT NULL DEFAULT 0,
  version INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS customer_auth_limits (
  limiter_key TEXT PRIMARY KEY,
  count INTEGER NOT NULL DEFAULT 1,
  expires_at INTEGER NOT NULL
);
