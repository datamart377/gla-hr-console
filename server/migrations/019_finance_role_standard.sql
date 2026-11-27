-- 019_finance_role_standard.sql
-- Standard Finance Officer role = full staff self-service PLUS:
--   modules: Dashboard, Leave, Attendance, Salary Advances, Suppliers, Stock
--   actions: Approve salary advances, Adjust stock & month-end
-- Everything else off (Employees, Payroll, Appraisals, Reports, Settings;
-- edit employees, approve leave, process payroll, change settings, edit
-- suppliers, log attendance for others, delete records).
-- Applies once on deploy; afterwards it stays editable in Settings -> Roles.
UPDATE settings
SET value = jsonb_set(
      value,
      '{roles}',
      (
        SELECT jsonb_agg(
          CASE
            WHEN r->>'id' = 'finance' THEN r || jsonb_build_object(
              'description', 'Staff self-service plus salary advances, suppliers & purchase orders, requisition payments and stock.',
              'modules', jsonb_build_object(
                'dashboard', true, 'employees', false, 'leave', true, 'attendance', true,
                'payroll', false, 'advances', true, 'suppliers', true, 'stock', true,
                'appraisals', false, 'reports', false, 'settings', false, 'selfservice', true),
              'actions', jsonb_build_object(
                'editEmployees', false, 'approveLeave', false, 'processPayroll', false,
                'manageAdvances', true, 'manageStock', true, 'manageSettings', false,
                'manageSuppliers', false, 'manageAttendance', false, 'deleteRecords', false))
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
