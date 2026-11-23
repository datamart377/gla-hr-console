-- 014_signatories_title.sql
-- Approved signatories: Ismail Kimuli is no longer a signatory, and Abu-Baker
-- Nsubuga prints with his title ("Managing Director") on statements, purchase
-- orders, vouchers and reports. Signatories remain editable in Settings.
UPDATE settings
SET value = jsonb_set(
      value,
      '{signatories}',
      COALESCE(
        (
          SELECT jsonb_agg(
            CASE
              WHEN s->>'name' ILIKE '%nsubuga%'
                THEN jsonb_set(s, '{title}', '"Managing Director"'::jsonb, true)
              ELSE s
            END
          )
          FROM jsonb_array_elements(
                 CASE WHEN jsonb_typeof(value->'signatories') = 'array'
                      THEN value->'signatories' ELSE '[]'::jsonb END
               ) AS s
          WHERE s->>'name' NOT ILIKE '%kimuli%'
            AND COALESCE(btrim(s->>'name'), '') <> ''
        ),
        '[{"name":"Abu-Baker Nsubuga","title":"Managing Director","contact":"256772413777"}]'::jsonb
      ),
      true
    ),
    updated_at = now()
WHERE key = 'app';
