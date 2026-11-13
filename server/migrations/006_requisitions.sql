-- Field fund requisitions (two-level approval: Supervisor -> HR & Admin).
-- Same id + JSONB doc shape as the other domain collections.
CREATE TABLE IF NOT EXISTS requisitions (
  id         TEXT PRIMARY KEY,
  doc        JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
