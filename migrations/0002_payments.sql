-- Run once AFTER 0001_init.sql, before deploying the payment-gated code.
-- Preserve sites that were already publicly shared before paid plans existed.
-- New sites are only created by the checkout endpoint, explicitly as 'pending'.
ALTER TABLE sites ADD COLUMN payment_status TEXT NOT NULL DEFAULT 'paid';

CREATE TABLE IF NOT EXISTS checkout_orders (
  order_id TEXT PRIMARY KEY,
  slug TEXT NOT NULL,
  amount_paise INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'INR',
  status TEXT NOT NULL DEFAULT 'created',
  payment_id TEXT,
  created_at TEXT NOT NULL,
  paid_at TEXT,
  FOREIGN KEY (slug) REFERENCES sites(slug)
);
CREATE INDEX IF NOT EXISTS idx_checkout_orders_slug ON checkout_orders(slug);
CREATE UNIQUE INDEX IF NOT EXISTS idx_checkout_orders_payment ON checkout_orders(payment_id) WHERE payment_id IS NOT NULL;
