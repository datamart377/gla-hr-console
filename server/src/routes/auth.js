// Authentication routes — login (JWT), current-user lookup, and self-service
// password reset (forgot → email link → set new password).
import { Router } from "express";
import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import { body } from "express-validator";
import { query } from "../db.js";
import { config } from "../config.js";
import { signToken, requireAuth } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { sendResetMail } from "../email.js";

const router = Router();

const sha256 = (s) => crypto.createHash("sha256").update(String(s)).digest("hex");

// POST /api/auth/login
router.post(
  "/login",
  [
    body("email").trim().isEmail().withMessage("A valid email is required."),
    body("password").isString().isLength({ min: 1 }).withMessage("Password is required."),
  ],
  validate,
  async (req, res, next) => {
    try {
      const { email, password } = req.body;
      const { rows } = await query(
        `SELECT id, email, password_hash, name, role, emp_id FROM users WHERE lower(email) = lower($1)`,
        [email],
      );
      const user = rows[0];
      // Constant-ish comparison path — always run bcrypt to avoid user enumeration.
      const ok = user ? await bcrypt.compare(password, user.password_hash) : await bcrypt.compare(password, "$2a$10$invalidinvalidinvalidinvalidinv");
      if (!user || !ok) return res.status(401).json({ error: "Invalid email or password." });
      const token = signToken(user);
      res.json({ token, user: { id: user.id, email: user.email, name: user.name, role: user.role, empId: user.emp_id } });
    } catch (e) { next(e); }
  },
);

// POST /api/auth/forgot-password — issues a one-time reset link by email.
// Always responds the same way whether or not the email matches an account, so
// it can't be used to discover which emails have accounts.
router.post(
  "/forgot-password",
  [body("email").trim().isEmail().withMessage("A valid email is required.")],
  validate,
  async (req, res, next) => {
    const generic = { ok: true, message: "If that email has an account, a password-reset link is on its way." };
    const emailIn = req.body.email;
    try {
      const { rows } = await query(`SELECT id, email, name FROM users WHERE lower(email) = lower($1)`, [emailIn]);
      const user = rows[0];
      if (!user) {
        // No LOGIN account (users table) for this address. Note: an employee
        // record is not a login account, so editing an employee's email does
        // not create/point a login here.
        console.log(`[forgot-password] no login account for "${emailIn}" — nothing sent`);
        return res.json(generic);
      }
      const token = crypto.randomBytes(32).toString("hex");
      const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
      await query(
        `INSERT INTO password_resets (user_id, token_hash, expires_at) VALUES ($1, $2, $3)`,
        [user.id, sha256(token), expires],
      );
      const base = (config.mail.appUrl || `${req.protocol}://${req.get("host")}`).replace(/\/+$/, "");
      // Email is best-effort and must not 500 the request. Log the outcome so a
      // misconfiguration is visible in the server logs.
      try {
        const out = await sendResetMail({ to: user.email, name: user.name, link: `${base}/?reset=${token}` });
        if (out && out.sent) console.log(`[forgot-password] reset email SENT to ${user.email}`);
        else console.warn(`[forgot-password] reset email NOT sent to ${user.email} (${out && out.reason}) — check SMTP_* env vars in Render`);
      } catch (mailErr) {
        console.error(`[forgot-password] SMTP send FAILED for ${user.email}: ${mailErr && mailErr.message ? mailErr.message : mailErr}`);
      }
      res.json(generic);
    } catch (e) { next(e); }
  },
);

// POST /api/auth/reset-password — consumes a valid token and sets a new password.
router.post(
  "/reset-password",
  [
    body("token").isString().isLength({ min: 10 }).withMessage("A reset token is required."),
    body("password").isString().isLength({ min: 8 }).withMessage("Password must be at least 8 characters."),
  ],
  validate,
  async (req, res, next) => {
    try {
      const { token, password } = req.body;
      const { rows } = await query(
        `SELECT id, user_id FROM password_resets
          WHERE token_hash = $1 AND used_at IS NULL AND expires_at > now()
          ORDER BY id DESC LIMIT 1`,
        [sha256(token)],
      );
      const row = rows[0];
      if (!row) return res.status(400).json({ error: "This reset link is invalid or has expired. Please request a new one." });
      const hash = await bcrypt.hash(password, 10);
      await query(`UPDATE users SET password_hash = $1, updated_at = now() WHERE id = $2`, [hash, row.user_id]);
      // Burn this token and any other outstanding tokens for the user.
      await query(`UPDATE password_resets SET used_at = now() WHERE user_id = $1 AND used_at IS NULL`, [row.user_id]);
      res.json({ ok: true });
    } catch (e) { next(e); }
  },
);

// GET /api/auth/me
router.get("/me", requireAuth, async (req, res, next) => {
  try {
    const { rows } = await query(`SELECT id, email, name, role, emp_id FROM users WHERE id = $1`, [req.user.sub]);
    if (!rows.length) return res.status(404).json({ error: "User not found." });
    const u = rows[0];
    res.json({ id: u.id, email: u.email, name: u.name, role: u.role, empId: u.emp_id });
  } catch (e) { next(e); }
});

export default router;
