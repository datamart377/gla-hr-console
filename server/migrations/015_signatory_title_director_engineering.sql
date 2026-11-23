-- 015_signatory_title_director_engineering.sql
-- Abu-Baker Nsubuga's approved-signatory title changes from "Managing Director"
-- to "Director, Engineering" on statements, purchase orders, vouchers and reports.
-- Signatories remain editable in Settings -> General.
UPDATE settings
SET value = jsonb_set(
      value,
      '{signatories}',
      (
        SELECT jsonb_agg(
          CASE
            WHEN s->>'name' ILIKE '%nsubuga%'
              THEN jsonb_set(s, '{title}', '"Director, Engineering"'::jsonb, true)
            ELSE s
          END
        )
        FROM jsonb_array_elements(value->'signatories') AS s
      ),
      true
    ),
    updated_at = now()
WHERE key = 'app'
  AND jsonb_typeof(value->'signatories') = 'array'
  AND jsonb_array_length(value->'signatories') > 0;
