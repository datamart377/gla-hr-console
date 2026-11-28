// Settings — a single JSON document (company profile, payroll rates, roles,
// departments, announcements). GET is available to any authenticated user;
// updates need Admin, or a management role whose live permissions include the
// Settings module and "Change system settings" (e.g. HR). Only Admin may change
// the Administrator role itself.
import { Router } from "express";
import { query } from "../db.js";
import { requireAuth } from "../middleware/auth.js";
import { liveRole, permits, resetRolesCache } from "./crud.js";
import { audit } from "../security/ids.js";

const router = Router();
router.use(requireAuth);

const KEY = "app";

router.get("/", async (req, res, next) => {
  try {
    const { rows } = await query(`SELECT value FROM settings WHERE key = $1`, [KEY]);
    res.json(rows.length ? rows[0].value : {});
  } catch (e) { next(e); }
});

async function canEditSettings(req) {
  const role = req.user && req.user.role;
  if (role === "admin") return true;
  if (!["hr", "finance"].includes(role)) return false;
  const r = await liveRole(role);
  return !!r && permits(r, ["modules", "settings"]) && permits(r, ["actions", "manageSettings"]);
}

// Merge a patch into the settings document.
router.put("/", async (req, res, next) => {
  try {
    if (!(await canEditSettings(req))) return res.status(403).json({ error: "You do not have permission to change system settings." });
    const patch = req.body && typeof req.body === "object" ? { ...req.body } : {};
    // Non-admins can't edit, add or remove the Administrator role.
    if (req.user.role !== "admin" && Array.isArray(patch.roles)) {
      const cur = await query(`SELECT value FROM settings WHERE key = $1`, [KEY]);
      const curRoles = (cur.rows[0] && cur.rows[0].value && Array.isArray(cur.rows[0].value.roles)) ? cur.rows[0].value.roles : [];
      const adminRole = curRoles.find((r) => r && r.id === "admin");
      patch.roles = patch.roles.filter((r) => r && r.id !== "admin");
      if (adminRole) patch.roles.unshift(adminRole);
    }
    const { rows } = await query(
      `INSERT INTO settings (key, value) VALUES ($1, $2::jsonb)
       ON CONFLICT (key) DO UPDATE SET value = settings.value || $2::jsonb, updated_at = now()
       RETURNING value`,
      [KEY, JSON.stringify(patch)],
    );
    if (patch.roles) resetRolesCache(); // permission changes take effect immediately
    // Changes that grant access or put signatures on payment documents are
    // security-relevant: log them (and alert at high severity).
    const keys = Object.keys(patch);
    if (patch.roles) audit(req, "permissions_changed", "high", `${req.user.email} changed role permissions`, { keys }).catch(() => {});
    if (patch.signatories) audit(req, "signatories_changed", "high", `${req.user.email} changed the approved signatories / signatures`, { keys }).catch(() => {});
    const other = keys.filter((k) => !["roles", "signatories"].includes(k));
    if (other.length) audit(req, "settings_changed", "info", `${req.user.email} changed settings: ${other.join(", ")}`, { keys: other }).catch(() => {});
    res.json(rows[0].value);
  } catch (e) { next(e); }
});

export default router;
