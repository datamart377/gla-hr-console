-- 020_hr_admin_full_selfservice.sql
-- HR Officer and Administrator: every module and action switched on, plus the
-- staff self-service portal ("selfservice"). HR can now also use Stock and
-- Settings ("Adjust stock & month-end", "Change system settings"); the server
-- honours HR's settings permission but never lets a non-admin alter the
-- Administrator role. Applies once on deploy; editable afterwards in Settings.
UPDATE settings
SET value = jsonb_set(
      value,
      '{roles}',
      (
        SELECT jsonb_agg(
          CASE
            WHEN r->>'id' IN ('admin', 'hr') THEN r || jsonb_build_object(
              'description', CASE WHEN r->>'id' = 'admin'
                THEN 'Full access to every module and action, plus staff self-service.'
                ELSE 'Runs day-to-day HR: staff, leave, attendance, payroll, stock and settings, plus staff self-service.' END,
              'modules', jsonb_build_object(
                'dashboard', true, 'employees', true, 'leave', true, 'attendance', true,
                'payroll', true, 'advances', true, 'suppliers', true, 'stock', true,
                'appraisals', true, 'reports', true, 'settings', true, 'selfservice', true),
              'actions', jsonb_build_object(
                'editEmployees', true, 'approveLeave', true, 'processPayroll', true,
                'manageAdvances', true, 'manageStock', true, 'manageSettings', true,
                'manageSuppliers', true, 'manageAttendance', true, 'deleteRecords', true))
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
