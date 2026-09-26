// Authentication routes — login (JWT) and current-user lookup.
import { Router } from "express";
import bcrypt from "bcryptjs";
import { body } from "express-validator";
import { query } from "../db.js";
import { signToken, requireAuth } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";

const router = Router();

// POST /api/auth/login
router.post(
  "/login",
  [
    body("email").isEmail().withMessage("A valid email is required.").normalizeEmail(),
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
