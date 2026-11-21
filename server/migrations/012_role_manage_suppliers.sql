-- 012_role_manage_suppliers.sql
-- Adds the "Add / edit suppliers" permission (manageSuppliers action) to the
-- existing roles in the live settings document, so the new supplier add/edit
-- gate has an explicit value to read (a missing action would default to allowed).
--   finance, staff -> false (finance may view suppliers but not add/edit/freeze;
--                     staff has no supplier UI)
--   admin, hr      -> true
-- Custom roles are left untouched; set their access from Settings -> Roles.
UPDATE settings
SET value = jsonb_set(
      value,
      '{roles}',
      (
        SELECT jsonb_agg(
          CASE
            WHEN r->>'id' IN ('finance', 'staff')
              THEN jsonb_set(r, '{actions,manageSuppliers}', 'false'::jsonb, true)
            WHEN r->>'id' IN ('admin', 'hr')
              THEN jsonb_set(r, '{actions,manageSuppliers}', 'true'::jsonb, true)
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
