-- 021_finance_requisitions_direct.sql
-- Requisitions raised by Finance Officers have ONE approval level (HR & Admin).
-- Mark every requisition raised by a finance user as route "finance_direct",
-- and move any still waiting on a supervisor straight to HR & Admin, noting
-- the change in its history.
UPDATE requisitions r
SET doc = r.doc
          || jsonb_build_object('route', 'finance_direct')
          || CASE WHEN r.doc->>'status' = 'pending_supervisor' THEN
               jsonb_build_object(
                 'status', 'pending_admin',
                 'supervisorIds', '[]'::jsonb,
                 'history', COALESCE(r.doc->'history', '[]'::jsonb) || jsonb_build_array(jsonb_build_object(
                   'at', to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
                   'by', 'system', 'byName', 'System', 'action', 'rerouted',
                   'note', 'Finance request — moved straight to HR & Admin for final approval (single approval level).')))
             ELSE '{}'::jsonb END,
    updated_at = now()
WHERE r.doc->>'requesterId' IN (SELECT emp_id FROM users WHERE role = 'finance' AND emp_id IS NOT NULL)
  AND COALESCE(r.doc->>'route', '') <> 'finance_direct';
