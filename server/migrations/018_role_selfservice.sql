-- 018_role_selfservice.sql
-- New role module "selfservice": the staff self-service portal (My Portal,
-- Update My Details, Clock In, My Leave, My Payslip, My Salary Advance, My File)
-- shown inside the console for roles that have it.
--   finance            -> true  (Finance Officer gets full staff self-service)
--   admin, hr, custom  -> false unless already set (no change to their menus)
--   staff (portal-only) is untouched — it already uses the portal itself.
-- Toggle per role from Settings -> Roles & Permissions.
UPDATE settings
SET value = jsonb_set(
      value,
      '{roles}',
      (
        SELECT jsonb_agg(
          CASE
            WHEN r->>'id' = 'finance'
              THEN jsonb_set(r, '{modules,selfservice}', 'true'::jsonb, true)
            WHEN r->>'id' <> 'staff' AND COALESCE(r->'modules'->>'selfservice', '') = ''
              THEN jsonb_set(r, '{modules,selfservice}', 'false'::jsonb, true)
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
