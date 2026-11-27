-- 023_quotations.sql
-- Client quotations (priced quotes sent to clients), same id + JSONB doc shape
-- as the other collections. New role module "quotations": Admin and HR on,
-- Finance and Staff off (toggle in Settings -> Roles & Permissions).
CREATE TABLE IF NOT EXISTS quotations (
  id         TEXT PRIMARY KEY,
  doc        JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

UPDATE settings
SET value = jsonb_set(
      value,
      '{roles}',
      (
        SELECT jsonb_agg(
          CASE
            WHEN r->>'id' IN ('admin', 'hr') THEN jsonb_set(r, '{modules,quotations}', 'true'::jsonb, true)
            WHEN r->>'id' <> 'staff' AND COALESCE(r->'modules'->>'quotations', '') = ''
              THEN jsonb_set(r, '{modules,quotations}', 'false'::jsonb, true)
            ELSE r
          END
        )
        FROM jsonb_array_elements(value->'roles') AS r
      ),
      true
    ),
    updated_at = now()
WHERE key = 'app'
  AND jsonb_typeof(value->'roles') = 'array';
