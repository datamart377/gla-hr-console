// Staff login-account management (admin / HR).
//
//  - invite       : give an employee a login (create it if missing) and email a
//                   one-time "set your password" link. Does not change an
//                   existing password.
//  - set-password : admin sets a specific password for an employee's login
//                   (creating the login if it doesn't exist yet).
//  - sync-email   : silently update an existing login's email/name to match the
//                   employee record (used when an employee is edited).
//  - list / status: which employees already have a login.
//
// Logins live in the `users` table and are keyed to an employee via emp_id, so
// the login email always follows the employee's email. The "set your password"
// link reuses the password_resets token flow.
import { Router } from "express";
import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import { body } from "express-validator";
import { query } from "../db.js";
import { config } from "../config.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { sendWelcomeMail } from "../email.js";

const router = Router();
router.use(requireAuth, requireRole("admin", "hr"));

const sha256 = (s) => crypto.createHash("sha256").update(String(s)).digest("hex");
const randomPassword = () => crypto.randomBytes(18).toString("hex");

async function getEmployee(empId) {
  const { rows } = await query(`SELECT doc FROM employees WHERE id = $1`, [empId]);
  return rows.length ? rows[0].doc || {} : null;
}
const empEmail = (emp) => (emp.email || (emp.contact && emp.contact.email) || "").trim();
const empName = (emp) => `${emp.firstName || ""} ${emp.lastName || ""}`.trim();

// Ensure the employee's login (users row, keyed by emp_id) exists and that its
// email / name / role match the employee record. Collapses any accidental
// duplicate logins for the employee. Returns { id, email, created } or
// { error: "no_email" | "email_taken" }.
async function syncLogin(empId, emp, { password } = {}) {
  const email = empEmail(emp);
  if (!email) return { error: "no_email" };
  const name = empName(emp);
  const role = emp.role || "staff";

  // The target email must not already belong to a DIFFERENT person's login.
  const taken = await query(
    `SELECT id FROM users WHERE lower(email) = lower($1) AND (emp_id IS DISTINCT FROM $2)`,
    [email, empId],
  );
  if (taken.rows.length) return { error: "email_taken" };

  const mine = await query(`SELECT id FROM users WHERE emp_id = $1 ORDER BY id ASC`, [empId]);
  if (mine.rows.length) {
    const keepId = mine.rows[0].id;
    if (mine.rows.length > 1) {
      await query(`DELETE FROM users WHERE emp_id = $1 AND id <> $2`, [empId, keepId]);
    }
    if (password) {
      await query(
        `UPDATE users SET email = $1, name = $2, role = $3, password_hash = $4, updated_at = now() WHERE id = $5`,
        [email, name, role, await bcrypt.hash(password, 10), keepId],
      );
    } else {
      await query(`UPDATE users SET email = $1, name = $2, role = $3, updated_at = now() WHERE id = $4`, [email, name, role, keepId]);
    }
    return { id: keepId, email, created: false };
  }

  const ins = await query(
    `INSERT INTO users (email, password_hash, name, role, emp_id) VALUES ($1, $2, $3, $4, $5) RETURNING id`,
    [email, await bcrypt.hash(password || randomPassword(), 10), name, role, empId],
  );
  return { id: ins.rows[0].id, email, created: true };
}

const takenMsg = (email) => `Another account already uses ${email}. Give this employee a different email first.`;

// GET /api/accounts — employees that have a login (+ last sign-in, for the sessions view).
router.get("/", async (req, res, next) => {
  try {
    const { rows } = await query(`SELECT emp_id, email, role, name, last_login_at FROM users WHERE emp_id IS NOT NULL ORDER BY role, name`);
    res.json(rows.map((r) => ({ empId: r.emp_id, email: r.email, role: r.role, name: r.name, lastLoginAt: r.last_login_at })));
  } catch (e) { next(e); }
});

// POST /api/accounts/:empId/revoke — end every active session for this login by
// bumping its token epoch. Existing tokens are rejected on their next request.
router.post("/:empId/revoke", async (req, res, next) => {
  try {
    const { rowCount } = await query(
      `UPDATE users SET token_epoch = token_epoch + 1, updated_at = now() WHERE emp_id = $1`,
      [req.params.empId],
    );
    if (!rowCount) return res.status(404).json({ error: "No login exists for that employee." });
    res.json({ ok: true, revoked: true });
  } catch (e) { next(e); }
});

// GET /api/accounts/:empId — whether this employee has a login.
router.get("/:empId", async (req, res, next) => {
  try {
    const { rows } = await query(`SELECT email, role FROM users WHERE emp_id = $1 ORDER BY id ASC LIMIT 1`, [req.params.empId]);
    if (!rows.length) return res.json({ hasLogin: false });
    res.json({ hasLogin: true, email: rows[0].email, role: rows[0].role });
  } catch (e) { next(e); }
});

// POST /api/accounts/invite { empId } — create/refresh the login + email a
// one-time set-password link. Does not change an existing password.
router.post("/invite", [body("empId").isString().trim().notEmpty()], validate, async (req, res, next) => {
  try {
    const empId = req.body.empId;
    const emp = await getEmployee(empId);
    if (!emp) return res.status(404).json({ error: "Employee not found." });
    const synced = await syncLogin(empId, emp);
    if (synced.error === "no_email") return res.status(400).json({ error: "This employee has no email address. Add one before creating a login." });
    if (synced.error === "email_taken") return res.status(409).json({ error: takenMsg(empEmail(emp)) });

    const token = crypto.randomBytes(32).toString("hex");
    const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
    await query(`INSERT INTO password_resets (user_id, token_hash, expires_at) VALUES ($1, $2, $3)`, [synced.id, sha256(token), expires]);

    const base = (config.mail.appUrl || `${req.protocol}://${req.get("host")}`).replace(/\/+$/, "");
    let emailed = false, reason = null;
    try {
      const out = await sendWelcomeMail({ to: synced.email, name: empName(emp), link: `${base}/?reset=${token}`, created: synced.created });
      emailed = !!(out && out.sent);
      reason = out && out.reason;
      console.log(emailed ? `[accounts/invite] welcome email SENT to ${synced.email}` : `[accounts/invite] welcome email NOT sent to ${synced.email} (${reason}) — check SMTP_* env vars`);
    } catch (mailErr) {
      reason = mailErr && mailErr.message ? mailErr.message : String(mailErr);
      console.error(`[accounts/invite] SMTP send FAILED for ${synced.email}: ${reason}`);
    }
    res.json({ ok: true, loginEmail: synced.email, created: synced.created, emailed, reason });
  } catch (e) { next(e); }
});

// POST /api/accounts/set-password { empId, password } — admin sets a password
// directly (creating/refreshing the login and syncing its email).
router.post(
  "/set-password",
  [
    body("empId").isString().trim().notEmpty(),
    body("password").isString().isLength({ min: 8 }).withMessage("Password must be at least 8 characters."),
  ],
  validate,
  async (req, res, next) => {
    try {
      const { empId, password } = req.body;
      const emp = await getEmployee(empId);
      if (!emp) return res.status(404).json({ error: "Employee not found." });
      const synced = await syncLogin(empId, emp, { password });
      if (synced.error === "no_email") return res.status(400).json({ error: "This employee has no email address. Add one before creating a login." });
      if (synced.error === "email_taken") return res.status(409).json({ error: takenMsg(empEmail(emp)) });
      // Any outstanding reset/invite links become void once a password is set.
      await query(`UPDATE password_resets SET used_at = now() WHERE user_id = $1 AND used_at IS NULL`, [synced.id]);
      res.json({ ok: true, loginEmail: synced.email, created: synced.created });
    } catch (e) { next(e); }
  },
);

// POST /api/accounts/sync-email { empId } — if the employee already has a login,
// update its email/name to match the employee. Creates nothing; sends nothing.
router.post("/sync-email", [body("empId").isString().trim().notEmpty()], validate, async (req, res, next) => {
  try {
    const empId = req.body.empId;
    const emp = await getEmployee(empId);
    if (!emp) return res.status(404).json({ error: "Employee not found." });
    const existing = await query(`SELECT id FROM users WHERE emp_id = $1 LIMIT 1`, [empId]);
    if (!existing.rows.length || !empEmail(emp)) return res.json({ synced: false });
    const synced = await syncLogin(empId, emp);
    if (synced.error === "email_taken") return res.status(409).json({ error: takenMsg(empEmail(emp)) });
    if (synced.error) return res.json({ synced: false });
    res.json({ synced: true, loginEmail: synced.email });
  } catch (e) { next(e); }
});

export default router;
