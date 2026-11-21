-- 010_finance_role_no_payroll.sql
-- Role/permission fix: the "Finance Officer" role was shipped with Payroll module
-- access and the process-payroll action enabled, so finance users could reach
-- Payroll even though it is not part of that role. (Separately, the client was
-- reading the seed roles instead of the saved ones, so the Settings toggle had
-- no effect — fixed in the app code.) This removes Payroll from the finance role
-- in the live settings document, so the already-stored configuration matches the
-- intended privileges. Administrators can still re-enable it from
-- Settings → Roles & Permissions, and that choice is now honoured.
UPDATE settings
SET value = jsonb_set(
      value,
      '{roles}',
      (
        SELECT jsonb_agg(
          CASE
            WHEN r->>'id' = 'finance'
              THEN jsonb_set(
                     jsonb_set(r, '{modules,payroll}', 'false'::jsonb, true),
                     '{actions,processPayroll}', 'false'::jsonb, true)
            ELSE r
          END
        )
        FROM jsonb_array_elements(value->'roles') AS r
      ),
      true
    ),
    updated_at = now()
WHERE key = 'app'
  AND jsonb_typeof(value->'roles') = 'array'
  AND EXISTS (SELECT 1 FROM jsonb_array_elements(value->'roles') AS r WHERE r->>'id' = 'finance');
