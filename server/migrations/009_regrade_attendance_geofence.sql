-- 009_regrade_attendance_geofence.sql
-- Re-grade stored attendance clock-ins with the accuracy-aware geofence verdict.
--
-- Earlier clock-ins compared the raw GPS point against the 150 m site radius
-- with NO allowance for the fix's accuracy. A weak fix (e.g. a ±2000 m
-- cell-tower / Wi-Fi fallback taken indoors) could place the reported point
-- hundreds of metres off the true position and get flagged a hard "Outside",
-- even though the accuracy circle still easily reached the site. This recomputes
-- a 3-state `verdict` (in / near / out) and withinFence from the stored
-- distanceM + accuracy against the 150 m radius, so historic rows stop showing
-- a false out-of-range:
--   in   = within radius AND fix precise (accuracy <= radius)
--   near = accuracy circle reaches the fence (weak GPS: on-site, flagged)
--   out  = beyond the fence even allowing for the full error margin
UPDATE attendance
SET doc = doc
      || jsonb_build_object(
           'verdict',
             CASE
               WHEN (doc->>'distanceM')::numeric <= 150
                    AND COALESCE((doc->>'accuracy')::numeric, 0) <= 150 THEN 'in'
               WHEN (doc->>'distanceM')::numeric
                    <= 150 + COALESCE((doc->>'accuracy')::numeric, 0) THEN 'near'
               ELSE 'out'
             END,
           'withinFence',
             (doc->>'distanceM')::numeric
               <= 150 + COALESCE((doc->>'accuracy')::numeric, 0),
           'lowAccuracy',
             COALESCE((doc->>'accuracy')::numeric, 0) > 150
         ),
    updated_at = now()
WHERE doc ? 'distanceM'
  AND doc->>'distanceM' IS NOT NULL
  AND doc->>'distanceM' <> ''
  AND doc->>'lat' IS NOT NULL
  AND doc->>'lat' <> '';
