-- 024_clients.sql
-- Client register for quotations. Every quotation is now raised against an
-- existing client (doc.clientId). Access follows the "quotations" role module.
CREATE TABLE IF NOT EXISTS clients (
  id         TEXT PRIMARY KEY,
  doc        JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Backfill: create a client for each distinct "Quote to" name on existing
-- quotations that aren't linked yet, then link those quotations to it.
INSERT INTO clients (id, doc)
SELECT 'CLI-' || upper(substr(md5(k), 1, 6)),
       jsonb_build_object('name', name, 'contactPerson', attn, 'sites', '[]'::jsonb, 'status', 'Active',
                          'notes', 'Created from existing quotations', 'createdAt', now(), 'updatedAt', now())
FROM (
  SELECT DISTINCT ON (lower(regexp_replace(trim(doc->>'client'), '\s+', ' ', 'g')))
         lower(regexp_replace(trim(doc->>'client'), '\s+', ' ', 'g')) AS k,
         regexp_replace(trim(doc->>'client'), '\s+', ' ', 'g') AS name,
         COALESCE(doc->>'attn', '') AS attn
  FROM quotations
  WHERE COALESCE(doc->>'clientId', '') = '' AND COALESCE(trim(doc->>'client'), '') <> ''
  ORDER BY lower(regexp_replace(trim(doc->>'client'), '\s+', ' ', 'g')), updated_at DESC
) q
WHERE NOT EXISTS (
  SELECT 1 FROM clients c WHERE lower(regexp_replace(trim(c.doc->>'name'), '\s+', ' ', 'g')) = q.k
)
ON CONFLICT (id) DO NOTHING;

UPDATE quotations q
SET doc = q.doc || jsonb_build_object('clientId', c.id), updated_at = now()
FROM clients c
WHERE COALESCE(q.doc->>'clientId', '') = ''
  AND lower(regexp_replace(trim(q.doc->>'client'), '\s+', ' ', 'g')) = lower(regexp_replace(trim(c.doc->>'name'), '\s+', ' ', 'g'));
