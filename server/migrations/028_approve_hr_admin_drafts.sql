-- 028_approve_hr_admin_drafts.sql
-- Quotations HR & Admin create are approved by them by default. Existing
-- drafts they prepared (i.e. not flagged needsApproval — those came from
-- Finance) are approved now, provided they have an Attn (mandatory before
-- approval). Drafts without an Attn stay drafts until it is added.
UPDATE quotations
SET doc = doc
          || jsonb_build_object('status', 'approved')
          || jsonb_build_object('approval', jsonb_build_object(
               'by', '', 'name', COALESCE(NULLIF(doc #>> '{initiatedBy,name}', ''), NULLIF(doc->>'preparedBy', ''), 'HR & Admin'),
               'role', COALESCE(doc #>> '{initiatedBy,role}', 'hr'), 'at', to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'), 'auto', true)),
    updated_at = now()
WHERE COALESCE(doc->>'status', 'draft') = 'draft'
  AND COALESCE((doc->>'needsApproval')::boolean, false) = false
  AND COALESCE(trim(doc->>'attn'), '') <> '';
