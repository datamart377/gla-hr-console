// /api/security — the intrusion detection console (Admin & HR only):
// overview, event log, IP blocks, account lockouts and alert settings.
import { Router } from "express";
import { query } from "../db.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { mailReady } from "../email.js";
import {
  RULES, SEVERITIES, getConfig, saveConfig, blockIp, unblockIp, loadBlocks, isAllowlisted,
  clientIp, ipSource, record, sendTestAlert, accountLock,
} from "../security/ids.js";

const router = Router();
router.use(requireAuth, requireRole("admin", "hr"));

const IP_RE = /^[0-9a-fA-F:.]{3,45}$/;

// GET /api/security/overview — everything the Security page needs in one call.
router.get("/overview", async (req, res, next) => {
  try {
    const [cfg, counts, byType, topIps, blocks, lockCand, unacked, trend] = await Promise.all([
      getConfig(true),
      query(`SELECT severity, count(*)::int AS n FROM security_events WHERE at > now() - interval '24 hours' GROUP BY severity`),
      query(`SELECT type, count(*)::int AS n FROM security_events WHERE at > now() - interval '24 hours' AND type NOT IN ('login_success') GROUP BY type ORDER BY n DESC LIMIT 12`),
      query(`SELECT ip, count(*)::int AS n, max(at) AS last,
                    count(*) FILTER (WHERE severity IN ('high','critical'))::int AS serious
               FROM security_events
              WHERE at > now() - interval '24 hours' AND ip IS NOT NULL AND severity <> 'info'
              GROUP BY ip ORDER BY serious DESC, n DESC LIMIT 8`),
      query(`SELECT ip, reason, created_at, expires_at, created_by, hits FROM security_blocks
              WHERE expires_at IS NULL OR expires_at > now() ORDER BY created_at DESC`),
      query(`SELECT DISTINCT lower(email) AS email FROM security_events
              WHERE type = 'login_failed' AND at > now() - ($1 || ' minutes')::interval AND email IS NOT NULL`,
            [String(RULES.accountLockout.windowMin + RULES.accountLockout.lockMin)]),
      query(`SELECT count(*)::int AS n FROM security_events WHERE NOT acknowledged AND severity IN ('high','critical') AND at > now() - interval '7 days'`),
      query(`SELECT date_trunc('hour', at) AS h, count(*) FILTER (WHERE severity IN ('high','critical'))::int AS serious,
                    count(*) FILTER (WHERE type = 'login_failed')::int AS failed, count(*)::int AS total
               FROM security_events WHERE at > now() - interval '24 hours' GROUP BY 1 ORDER BY 1`),
    ]);
    const locked = [];
    for (const r of lockCand.rows) {
      const l = await accountLock(r.email);
      if (l) locked.push({ email: r.email, failures: l.failures, until: l.until });
    }
    const sev = Object.fromEntries(SEVERITIES.map((s) => [s, 0]));
    counts.rows.forEach((r) => { sev[r.severity] = r.n; });
    const ip = req.clientIp || clientIp(req);
    res.json({
      monitoring: true,
      config: cfg,
      mailReady: mailReady(),
      rules: RULES,
      you: { ip, source: ipSource(req), allowlisted: isAllowlisted(ip, cfg.allowlist) },
      last24h: { bySeverity: sev, byType: byType.rows, topIps: topIps.rows, trend: trend.rows },
      unacknowledged: unacked.rows[0].n,
      blocks: blocks.rows,
      locked,
    });
  } catch (e) { next(e); }
});

// GET /api/security/events?severity=&type=&ip=&q=&unack=1&limit=&before=
router.get("/events", async (req, res, next) => {
  try {
    const where = []; const args = [];
    const add = (sql, v) => { args.push(v); where.push(sql.replace("$?", `$${args.length}`)); };
    if (req.query.severity && SEVERITIES.includes(req.query.severity)) {
      add(`severity = ANY($?)`, SEVERITIES.slice(SEVERITIES.indexOf(req.query.severity)));
    }
    if (req.query.type) add(`type = $?`, String(req.query.type));
    if (req.query.ip) add(`ip = $?`, String(req.query.ip));
    if (req.query.q) add(`(coalesce(email,'') || ' ' || coalesce(path,'') || ' ' || coalesce(ip,'') || ' ' || coalesce(detail->>'summary','')) ILIKE $?`, `%${String(req.query.q).slice(0, 80)}%`);
    if (req.query.unack === "1") where.push(`NOT acknowledged`);
    if (req.query.hideRoutine === "1") where.push(`type NOT IN ('login_success','record_deleted','settings_changed','password_reset_requested')`);
    if (req.query.before) add(`id < $?`, Number(req.query.before) || 0);
    const limit = Math.min(500, Math.max(1, Number(req.query.limit) || 100));
    const { rows } = await query(
      `SELECT id, at, type, severity, ip, email, method, path, user_agent, detail, acknowledged, ack_by, ack_at
         FROM security_events ${where.length ? "WHERE " + where.join(" AND ") : ""}
        ORDER BY id DESC LIMIT ${limit}`,
      args,
    );
    res.json(rows);
  } catch (e) { next(e); }
});

// POST /api/security/events/ack { ids: [..] } or { all: true }
router.post("/events/ack", async (req, res, next) => {
  try {
    const who = req.user.email;
    if (req.body && req.body.all) {
      const { rowCount } = await query(`UPDATE security_events SET acknowledged = true, ack_by = $1, ack_at = now() WHERE NOT acknowledged`, [who]);
      return res.json({ ok: true, count: rowCount });
    }
    const ids = (Array.isArray(req.body && req.body.ids) ? req.body.ids : []).map(Number).filter(Boolean).slice(0, 500);
    if (!ids.length) return res.status(400).json({ error: "No events selected." });
    const { rowCount } = await query(`UPDATE security_events SET acknowledged = true, ack_by = $1, ack_at = now() WHERE id = ANY($2)`, [who, ids]);
    res.json({ ok: true, count: rowCount });
  } catch (e) { next(e); }
});

// POST /api/security/blocks { ip, minutes (0 = until removed), reason }
router.post("/blocks", async (req, res, next) => {
  try {
    const ip = String((req.body && req.body.ip) || "").trim();
    if (!IP_RE.test(ip)) return res.status(400).json({ error: "Enter a valid IP address." });
    const mine = req.clientIp || clientIp(req);
    if (ip === mine) return res.status(400).json({ error: "That's the address you're connected from — blocking it would lock you out." });
    const cfg = await getConfig();
    if (isAllowlisted(ip, cfg.allowlist)) return res.status(400).json({ error: "That address is on the allow-list. Remove it from the allow-list first." });
    const minutes = Math.max(0, Math.min(60 * 24 * 365, Number(req.body.minutes) || 0));
    const reason = String((req.body && req.body.reason) || "Blocked manually").slice(0, 200);
    await blockIp(ip, { minutes: minutes || null, reason, by: req.user.email });
    await record("ip_blocked", "medium", req, { detail: { blocked: ip, minutes, manual: true }, summary: `${req.user.email} blocked ${ip}${minutes ? ` for ${minutes} min` : " until removed"}: ${reason}` });
    res.json({ ok: true });
  } catch (e) { next(e); }
});

// DELETE /api/security/blocks/:ip
router.delete("/blocks/:ip", async (req, res, next) => {
  try {
    const ip = String(req.params.ip || "").trim();
    await unblockIp(ip);
    await record("ip_unblocked", "info", req, { detail: { unblocked: ip }, summary: `${req.user.email} unblocked ${ip}` });
    await loadBlocks(true);
    res.json({ ok: true });
  } catch (e) { next(e); }
});

// POST /api/security/unlock { email } — clear a sign-in lockout.
router.post("/unlock", async (req, res, next) => {
  try {
    const email = String((req.body && req.body.email) || "").trim().toLowerCase();
    if (!email) return res.status(400).json({ error: "Email is required." });
    await record("account_unlocked", "info", req, { email, detail: { by: req.user.email }, summary: `${req.user.email} unlocked ${email}` });
    res.json({ ok: true });
  } catch (e) { next(e); }
});

// PUT /api/security/config { autoBlock, emailAlerts, alertMinSeverity, allowlist, extraRecipients }
router.put("/config", async (req, res, next) => {
  try {
    const before = await getConfig(true);
    const cfg = await saveConfig(req.body || {});
    const changed = Object.keys(cfg).filter((k) => JSON.stringify(cfg[k]) !== JSON.stringify(before[k]));
    if (changed.length) {
      const weakened = (before.autoBlock && !cfg.autoBlock) || (before.emailAlerts && !cfg.emailAlerts);
      await record("security_settings_changed", weakened ? "high" : "medium", req, { detail: { changed }, summary: `${req.user.email} changed security settings: ${changed.join(", ")}${weakened ? " (protection reduced)" : ""}` });
    }
    res.json(cfg);
  } catch (e) { next(e); }
});

// POST /api/security/test-alert — send a test alert email to the recipients.
router.post("/test-alert", async (req, res, next) => {
  try { res.json(await sendTestAlert(req)); } catch (e) { next(e); }
});

export default router;
