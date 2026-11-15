-- Purchase orders issued to suppliers against their quotations.
-- Same id + JSONB doc shape as the other domain collections.
CREATE TABLE IF NOT EXISTS purchase_orders (
  id         TEXT PRIMARY KEY,
  doc        JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
