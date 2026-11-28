-- 027_finance_quotations.sql
-- Finance officers initiate quotations; HR & Admin approve them (enforced in
-- crud.js shapeQuotation). Turn the "Clients & quotations" module on for the
-- Finance role so they can prepare quotations and manage clients.
UPDATE settings
SET value = jsonb_set(
      value,
      '{roles}',
      (
        SELECT jsonb_agg(
          CASE WHEN r->>'id' = 'finance' THEN jsonb_set(r, '{modules,quotations}', 'true'::jsonb, true) ELSE r END
        )
        FROM jsonb_array_elements(value->'roles') AS r
      ),
      true
    ),
    updated_at = now()
WHERE key = 'app'
  AND jsonb_typeof(value->'roles') = 'array';
