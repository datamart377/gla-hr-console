// Settings — a single JSON document (company profile, payroll rates, roles,
// departments, announcements). GET is available to any authenticated user;
// updates are restricted to admins.
import { Router } from "express";
import { query } from "../db.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

const router = Router();
router.use(requireAuth);

const KEY = "app";

router.get("/", async (req, res, next) => {
  try {
    const { rows } = await query(`SELECT value FROM settings WHERE key = $1`, [KEY]);
    res.json(rows.length ? rows[0].value : {});
  } catch (e) { next(e); }
});

// Merge a patch into the settings document (admin only).
router.put("/", requireRole("admin"), async (req, res, next) => {
  try {
    const patch = req.body && typeof req.body === "object" ? req.body : {};
    const { rows } = await query(
      `INSERT INTO settings (key, value) VALUES ($1, $2::jsonb)
       ON CONFLICT (key) DO UPDATE SET value = settings.value || $2::jsonb, updated_at = now()
       RETURNING value`,
      [KEY, JSON.stringify(patch)],
    );
    res.json(rows[0].value);
  } catch (e) { next(e); }
});

export default router;
