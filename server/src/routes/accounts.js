// Staff login-account management (admin / HR).
//
//  - invite       : give an employee a login (create it if missing) and email a
//                   one-time "set your password" link. Does not overwrite an
//                   existing password.
//  - set-password : admin sets a specific password for an employee's login
//                   (creating the login if it doesn't exist yet).
//  - list / status: which employees already have a login.
//
// Logins live in the `users` table, keyed by email and linked to an employee via
// emp_id. The "set your password" link reuses the password_resets token flow.
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

// GET /api/accounts — employees that have a login.
router.get("/", async (req, res, next) => {
  try {
    const { rows } = await query(`SELECT emp_id, email, role FROM users WHERE emp_id IS NOT NULL`);
    res.json(rows.map((r) => ({ empId: r.emp_id, email: r.email, role: r.role })));
  } catch (e) { next(e); }
});

// GET /api/accounts/:empId — whether this employee has a login.
router.get("/:empId", async (req, res, next) => {
  try {
    const { rows } = await query(`SELECT email, role FROM users WHERE emp_id = $1 LIMIT 1`, [req.params.empId]);
    if (!rows.length) return res.json({ hasLogin: false });
    res.json({ hasLogin: true, email: rows[0].email, role: rows[0].role });
  } catch (e) { next(e); }
});

// POST /api/accounts/invite { empId } — create login if missing + email a
// one-time set-password link. Never overwrites an existing password.
router.post("/invite", [body("empId").isString().trim().notEmpty()], validate, async (req, res, next) => {
  try {
    const empId = req.body.empId;
    const emp = await getEmployee(empId);
    if (!emp) return res.status(404).json({ error: "Employee not found." });
    const email = empEmail(emp);
    if (!email) return res.status(400).json({ error: "This employee has no email address. Add one before creating a login." });
    const name = empName(emp);
    const role = emp.role || "staff";

    const ins = await query(
      `INSERT INTO users (email, password_hash, name, role, emp_id)
         VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (email) DO UPDATE SET emp_id = EXCLUDED.emp_id, name = EXCLUDED.name
       RETURNING id, (xmax = 0) AS created`,
      [email, await bcrypt.hash(randomPassword(), 10), name, role, empId],
    );
    const userId = ins.rows[0].id;
    const created = ins.rows[0].created;

    const token = crypto.randomBytes(32).toString("hex");
    const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
    await query(`INSERT INTO password_resets (user_id, token_hash, expires_at) VALUES ($1, $2, $3)`, [userId, sha256(token), expires]);

    const base = (config.mail.appUrl || `${req.protocol}://${req.get("host")}`).replace(/\/+$/, "");
    let emailed = false, reason = null;
    try {
      const out = await sendWelcomeMail({ to: email, name, link: `${base}/?reset=${token}`, created });
      emailed = !!(out && out.sent);
      reason = out && out.reason;
      console.log(emailed ? `[accounts/invite] welcome email SENT to ${email}` : `[accounts/invite] welcome email NOT sent to ${email} (${reason}) — check SMTP_* env vars`);
    } catch (mailErr) {
      reason = mailErr && mailErr.message ? mailErr.message : String(mailErr);
      console.error(`[accounts/invite] SMTP send FAILED for ${email}: ${reason}`);
    }
    res.json({ ok: true, loginEmail: email, created, emailed, reason });
  } catch (e) { next(e); }
});

// POST /api/accounts/set-password { empId, password } — admin sets a password
// directly (creating the login if it doesn't exist).
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
      const email = empEmail(emp);
      if (!email) return res.status(400).json({ error: "This employee has no email address. Add one before creating a login." });
      const name = empName(emp);
      const role = emp.role || "staff";

      const { rows } = await query(
        `INSERT INTO users (email, password_hash, name, role, emp_id)
           VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash, emp_id = EXCLUDED.emp_id, name = EXCLUDED.name
         RETURNING id, (xmax = 0) AS created`,
        [email, await bcrypt.hash(password, 10), name, role, empId],
      );
      // Any outstanding reset/invite links become void once a password is set.
      await query(`UPDATE password_resets SET used_at = now() WHERE user_id = $1 AND used_at IS NULL`, [rows[0].id]);
      res.json({ ok: true, loginEmail: email, created: rows[0].created });
    } catch (e) { next(e); }
  },
);

export default router;
