-- 013_role_manage_attendance.sql
-- Adds the "Log attendance for others" permission (manageAttendance action) to
-- the existing roles in the live settings document. Without it, a role is locked
-- to clocking itself in (the register's "Signed in as" picker is fixed to the
-- current user) and cannot use Manual entry / Log attendance or delete records.
--   finance, staff -> false
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
              THEN jsonb_set(r, '{actions,manageAttendance}', 'false'::jsonb, true)
            WHEN r->>'id' IN ('admin', 'hr')
              THEN jsonb_set(r, '{actions,manageAttendance}', 'true'::jsonb, true)
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
