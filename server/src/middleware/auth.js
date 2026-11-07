// JWT authentication + role-based authorization middleware.
import jwt from "jsonwebtoken";
import { config } from "../config.js";
import { query } from "../db.js";

// `te` (token epoch) pins the token to the user's current session generation.
// Bumping users.token_epoch (an admin "revoke") invalidates every token issued
// before the bump. `expiresIn` overrides the default lifetime (e.g. remember-me).
export function signToken(user, { expiresIn } = {}) {
  return jwt.sign(
    { sub: user.id, email: user.email, role: user.role, empId: user.emp_id, name: user.name, te: user.token_epoch || 0 },
    config.jwt.secret,
    { expiresIn: expiresIn || config.jwt.expiresIn },
  );
}

// Requires a valid Bearer token whose epoch still matches the user's; attaches req.user.
export async function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: "Authentication required." });
  let payload;
  try {
    payload = jwt.verify(token, config.jwt.secret);
  } catch {
    return res.status(401).json({ error: "Invalid or expired session. Please sign in again." });
  }
  try {
    const { rows } = await query(`SELECT token_epoch FROM users WHERE id = $1`, [payload.sub]);
    if (!rows.length) return res.status(401).json({ error: "This account no longer exists. Please sign in again." });
    if ((rows[0].token_epoch || 0) !== (payload.te || 0)) {
      return res.status(401).json({ error: "This session was ended. Please sign in again." });
    }
  } catch (e) {
    return next(e); // DB trouble — fail closed via the error handler
  }
  req.user = payload;
  next();
}

// Restricts a route to the given roles (e.g. requireRole("admin", "hr")).
export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: "Authentication required." });
    if (!roles.includes(req.user.role)) return res.status(403).json({ error: "You do not have permission to perform this action." });
    next();
  };
}
