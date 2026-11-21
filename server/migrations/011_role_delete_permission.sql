-- 011_role_delete_permission.sql
-- Adds the new "Delete records" permission (deleteRecords action) to the existing
-- roles in the live settings document, so the gate the app now enforces has an
-- explicit value to read (a missing action would otherwise default to allowed).
--   finance, staff -> false (finance may not delete anything; staff has no
--                     delete UI anyway)
--   admin, hr      -> true  (so their Settings toggle reads correctly; they can
--                     still delete, and an admin can change any of these later)
-- Custom roles are left untouched; an administrator sets their delete access
-- from Settings -> Roles & Permissions.
UPDATE settings
SET value = jsonb_set(
      value,
      '{roles}',
      (
        SELECT jsonb_agg(
          CASE
            WHEN r->>'id' IN ('finance', 'staff')
              THEN jsonb_set(r, '{actions,deleteRecords}', 'false'::jsonb, true)
            WHEN r->>'id' IN ('admin', 'hr')
              THEN jsonb_set(r, '{actions,deleteRecords}', 'true'::jsonb, true)
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
