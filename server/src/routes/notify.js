// System notifications — sends an email for a specific HR event to the
// employee it concerns. The recipient is resolved from the employee record
// inside email.js (by empId), so a caller cannot target arbitrary addresses.
//
// Email is best-effort: a send failure returns { sent:false } with HTTP 200 so
// it never breaks the core action the front-end just performed.
import { Router } from "express";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { sendEventMail, mailReady } from "../email.js";

const router = Router();
router.use(requireAuth, requireRole("admin", "hr"));

const ALLOWED = new Set(["leave_decision", "advance_decision", "profile_decision", "staff_welcome"]);

// Lets the UI tell whether email is configured (e.g. to show a hint).
router.get("/status", (req, res) => res.json({ configured: mailReady() }));

router.post("/", async (req, res) => {
  const { type, empId, data } = req.body || {};
  if (!ALLOWED.has(type)) return res.status(400).json({ error: "Unknown notification type." });
  if (!empId) return res.status(400).json({ error: "empId is required." });
  try {
    const out = await sendEventMail({ type, empId, data: data && typeof data === "object" ? data : {} });
    res.json(out);
  } catch (e) {
    console.error("notify send failed:", e && e.message ? e.message : e);
    res.json({ sent: false, reason: "send_failed" });
  }
});

export default router;
