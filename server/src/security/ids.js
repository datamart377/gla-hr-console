// Intrusion detection & response (IDS/IPS) for IHRSM.
//
// What it watches (all server-side, so it can't be bypassed from the browser):
//   - Sign-in brute force on one account          -> account lockout
//   - Password spraying / credential stuffing (many accounts or many failures
//     from one network)                           -> temporary IP block
//   - Vulnerability scanners probing for files that don't exist here
//     (/.env, /wp-login.php, /.git/…)              -> 404 + IP block on repeat
//   - Injection / traversal payloads in URLs (SQLi, XSS, ../)
//                                                   -> 400 + IP block on repeat
//   - Forged or tampered sign-in tokens            -> logged, IP block on repeat
//   - Repeated attempts to change data the user isn't allowed to touch
//   - Insider-risk changes: bank details edited, roles/permissions or
//     signatories changed, mass deletion of records
//   - Rate-limit trips
//
// How it reacts: every event is written to security_events; high/critical
// ones email the administrators (throttled); IP blocks expire on their own.
//
// IP blocks only stop UNAUTHENTICATED traffic (sign-in, password reset, probes,
// API calls without a valid token). Staff already signed in keep working, so a
// block on a shared office connection can't lock the whole office out.
import jwt from "jsonwebtoken";
import { query } from "../db.js";
import { config } from "../config.js";
import { sendSecurityAlertMail } from "../email.js";

export const SEVERITIES = ["info", "low", "medium", "high", "critical"];
const sevRank = (s) => Math.max(0, SEVERITIES.indexOf(s));

// Fixed detection thresholds (shown read-only on the Security page).
export const RULES = {
  accountLockout: { failures: 5, windowMin: 15, lockMin: 15 },
  ipFailures: { failures: 12, distinctAccounts: 4, windowMin: 15, blockMin: 60 },
  probes: { count: 5, windowMin: 10, blockMin: 24 * 60 },
  attackPatterns: { count: 3, windowMin: 10, blockMin: 24 * 60 },
  badTokens: { count: 5, windowMin: 10, blockMin: 60 },
  deniedWrites: { count: 10, windowMin: 10 },
  massDelete: { count: 10, windowMin: 10 },
  retentionDays: 90,
};

const DEFAULT_CONFIG = { autoBlock: true, emailAlerts: true, alertMinSeverity: "high", allowlist: [], extraRecipients: [] };

/* ------------------------------- client IP -------------------------------- */
// Render sits behind Cloudflare. When a request came through Cloudflare (it
// always carries cf-ray), CF-Connecting-IP is set by Cloudflare itself and
// holds the real visitor address; otherwise use Express's proxy-aware req.ip.
export function clientIp(req) {
  const cf = req.headers["cf-connecting-ip"];
  if (cf && req.headers["cf-ray"] && process.env.IDS_TRUST_CLOUDFLARE !== "false") return String(cf).trim();
  return String(req.ip || req.socket?.remoteAddress || "").replace(/^::ffff:/, "");
}
export function ipSource(req) {
  return req.headers["cf-connecting-ip"] && req.headers["cf-ray"] && process.env.IDS_TRUST_CLOUDFLARE !== "false" ? "cloudflare" : "proxy";
}

/* ------------------------------ configuration ----------------------------- */
let cfg = { ...DEFAULT_CONFIG };
let cfgAt = 0;
export async function getConfig(force = false) {
  if (!force && Date.now() - cfgAt < 30_000) return cfg;
  try {
    const { rows } = await query(`SELECT value FROM settings WHERE key = 'security'`);
    cfg = { ...DEFAULT_CONFIG, ...((rows[0] && rows[0].value) || {}) };
  } catch { /* keep the last good config */ }
  cfgAt = Date.now();
  return cfg;
}
export async function saveConfig(patch) {
  const clean = {};
  if ("autoBlock" in patch) clean.autoBlock = !!patch.autoBlock;
  if ("emailAlerts" in patch) clean.emailAlerts = !!patch.emailAlerts;
  if ("alertMinSeverity" in patch && SEVERITIES.includes(patch.alertMinSeverity)) clean.alertMinSeverity = patch.alertMinSeverity;
  if ("allowlist" in patch) clean.allowlist = (Array.isArray(patch.allowlist) ? patch.allowlist : String(patch.allowlist || "").split(/[\s,;]+/))
    .map((x) => String(x).trim()).filter((x) => /^[0-9a-fA-F:.]+(\/\d{1,3})?$/.test(x)).slice(0, 100);
  if ("extraRecipients" in patch) clean.extraRecipients = (Array.isArray(patch.extraRecipients) ? patch.extraRecipients : String(patch.extraRecipients || "").split(/[\s,;]+/))
    .map((x) => String(x).trim()).filter((x) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(x)).slice(0, 10);
  await query(
    `INSERT INTO settings (key, value) VALUES ('security', $1::jsonb)
     ON CONFLICT (key) DO UPDATE SET value = settings.value || $1::jsonb, updated_at = now()`,
    [JSON.stringify(clean)],
  );
  return getConfig(true);
}

// Allow-list entries are exact IPs or IPv4 CIDR ranges.
function ipv4ToInt(ip) { const p = ip.split(".").map(Number); return p.length === 4 && p.every((n) => n >= 0 && n <= 255) ? ((p[0] << 24) >>> 0) + (p[1] << 16) + (p[2] << 8) + p[3] : null; }
export function isAllowlisted(ip, list = cfg.allowlist) {
  return (list || []).some((entry) => {
    if (!entry.includes("/")) return entry === ip;
    const [base, bits] = entry.split("/"); const b = ipv4ToInt(base), i = ipv4ToInt(ip), n = Number(bits);
    if (b == null || i == null || !(n >= 0 && n <= 32)) return false;
    const mask = n === 0 ? 0 : (~0 << (32 - n)) >>> 0;
    return (b & mask) === (i & mask);
  });
}

/* ----------------------------- sliding windows ---------------------------- */
const windows = new Map(); // key -> [timestamps]
function bump(key, windowMin, value = Date.now()) {
  const cutoff = Date.now() - windowMin * 60_000;
  const arr = (windows.get(key) || []).filter((t) => t > cutoff);
  arr.push(value);
  windows.set(key, arr);
  return arr.length;
}
const distinct = new Map(); // key -> Map(value -> ts)
function bumpDistinct(key, item, windowMin) {
  const cutoff = Date.now() - windowMin * 60_000;
  const m = distinct.get(key) || new Map();
  for (const [k, t] of m) if (t <= cutoff) m.delete(k);
  m.set(item, Date.now());
  distinct.set(key, m);
  return m.size;
}
setInterval(() => { // keep memory bounded
  const cutoff = Date.now() - 24 * 60 * 60_000;
  for (const [k, arr] of windows) { const a = arr.filter((t) => t > cutoff); if (a.length) windows.set(k, a); else windows.delete(k); }
  for (const [k, m] of distinct) { for (const [i, t] of m) if (t <= cutoff) m.delete(i); if (!m.size) distinct.delete(k); }
}, 10 * 60_000).unref();

/* --------------------------------- blocks --------------------------------- */
let blocks = new Map(); // ip -> { reason, expiresAt }
let blocksAt = 0;
export async function loadBlocks(force = false) {
  if (!force && Date.now() - blocksAt < 30_000) return blocks;
  try {
    const { rows } = await query(`SELECT ip, reason, expires_at FROM security_blocks WHERE expires_at IS NULL OR expires_at > now()`);
    blocks = new Map(rows.map((r) => [r.ip, { reason: r.reason, expiresAt: r.expires_at ? new Date(r.expires_at).getTime() : null }]));
  } catch { /* keep the last good list */ }
  blocksAt = Date.now();
  return blocks;
}
export function isBlocked(ip) {
  const b = blocks.get(ip);
  if (!b) return null;
  if (b.expiresAt && b.expiresAt <= Date.now()) { blocks.delete(ip); return null; }
  return b;
}
export async function blockIp(ip, { minutes, reason, by = "auto" }) {
  if (!ip) return false;
  const expires = minutes ? new Date(Date.now() + minutes * 60_000) : null;
  await query(
    `INSERT INTO security_blocks (ip, reason, expires_at, created_by) VALUES ($1, $2, $3, $4)
     ON CONFLICT (ip) DO UPDATE SET reason = EXCLUDED.reason, expires_at = EXCLUDED.expires_at, created_by = EXCLUDED.created_by, created_at = now()`,
    [ip, reason, expires, by],
  );
  blocks.set(ip, { reason, expiresAt: expires ? expires.getTime() : null });
  return true;
}
export async function unblockIp(ip) {
  await query(`DELETE FROM security_blocks WHERE ip = $1`, [ip]);
  blocks.delete(ip);
  // Forget the counters too, so one more slip doesn't re-block straight away.
  for (const k of [...windows.keys()]) if (k.endsWith(`:${ip}`)) windows.delete(k);
  for (const k of [...distinct.keys()]) if (k.endsWith(`:${ip}`)) distinct.delete(k);
}

/* ------------------------------ event logging ----------------------------- */
const ctxOf = (req) => (req ? {
  ip: req.clientIp || clientIp(req),
  method: req.method,
  path: String(req.originalUrl || req.url || "").slice(0, 300),
  user_agent: String(req.headers["user-agent"] || "").slice(0, 300),
  user_id: req.user ? req.user.sub : null,
  email: req.user ? req.user.email : null,
} : {});

export async function record(type, severity, req, { email, detail = {}, summary } = {}) {
  const c = ctxOf(req);
  const row = { ...c, email: email || c.email || null };
  try {
    await query(
      `INSERT INTO security_events (type, severity, ip, user_id, email, method, path, user_agent, detail)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb)`,
      [type, severity, row.ip || null, row.user_id || null, row.email ? String(row.email).toLowerCase() : null, row.method || null, row.path || null, row.user_agent || null, JSON.stringify({ ...detail, ...(summary ? { summary } : {}) })],
    );
  } catch (e) { console.error("[ids] could not record event:", e.message); }
  const tag = sevRank(severity) >= sevRank("high") ? "SECURITY" : "security";
  console.log(`[${tag}] ${severity.toUpperCase()} ${type} ip=${row.ip || "-"}${row.email ? ` user=${row.email}` : ""}${summary ? ` — ${summary}` : ""}`);
  if (sevRank(severity) >= sevRank("medium")) alert(type, severity, row, summary || type).catch(() => {});
}

/* --------------------------------- alerts --------------------------------- */
const lastAlert = new Map(); // type|ip -> ts
const suppressed = new Map(); // type|ip -> count since last email
async function alert(type, severity, row, summary) {
  const c = await getConfig();
  if (!c.emailAlerts || sevRank(severity) < sevRank(c.alertMinSeverity)) return;
  const key = `${type}|${row.ip || ""}`;
  const last = lastAlert.get(key) || 0;
  if (Date.now() - last < 15 * 60_000) { suppressed.set(key, (suppressed.get(key) || 0) + 1); return; }
  const extra = suppressed.get(key) || 0;
  lastAlert.set(key, Date.now()); suppressed.delete(key);
  let admins = [];
  try { admins = (await query(`SELECT email FROM users WHERE role = 'admin'`)).rows.map((r) => r.email); } catch { /* ignore */ }
  const lines = [
    summary,
    `When: ${new Date().toUTCString()}`,
    row.ip ? `From address: ${row.ip}` : null,
    row.email ? `Account: ${row.email}` : null,
    row.path ? `Request: ${row.method || ""} ${row.path}` : null,
    extra ? `${extra} similar event(s) in the last 15 minutes were not emailed separately.` : null,
  ].filter(Boolean);
  try { await sendSecurityAlertMail({ to: [...admins, ...(c.extraRecipients || [])], subject: summary, lines, severity }); }
  catch (e) { console.error("[ids] alert email failed:", e.message); }
}
export async function sendTestAlert(req) {
  const c = await getConfig(true);
  const admins = (await query(`SELECT email FROM users WHERE role = 'admin'`)).rows.map((r) => r.email);
  return sendSecurityAlertMail({
    to: [...admins, ...(c.extraRecipients || [])], subject: "Test alert", severity: "info",
    lines: ["This is a test of IHRSM security alerts.", `Requested by: ${req.user ? req.user.email : "unknown"}`, `When: ${new Date().toUTCString()}`],
  });
}

// Block automatically when allowed (auto-block on, address not allow-listed).
async function autoBlock(req, ip, minutes, reason) {
  const c = await getConfig();
  if (!c.autoBlock || !ip || isAllowlisted(ip, c.allowlist) || isBlocked(ip)) return false;
  await blockIp(ip, { minutes, reason, by: "auto" });
  await record("ip_blocked", "high", req, { detail: { minutes, reason }, summary: `Address ${ip} blocked for ${minutes >= 60 ? `${Math.round(minutes / 60)} hour(s)` : `${minutes} min`}: ${reason}` });
  return true;
}

/* --------------------------- request inspection --------------------------- */
// Paths only a vulnerability scanner asks for — nothing here serves them.
const PROBE_RE = new RegExp([
  "^/\\.(env|git|svn|hg|ds_store|aws|ssh|htaccess|htpasswd|npmrc|docker)",
  "/\\.env(\\.|$)", "/\\.git/", "^/wp-", "/wp-(admin|login|content|includes|json)", "xmlrpc\\.php", "\\.(php\\d?|asp|aspx|jsp|cgi|pl)(\\?|$)",
  "^/(phpmyadmin|pma|myadmin|mysql|adminer|cgi-bin|vendor/phpunit|actuator|server-status|server-info|solr|jenkins|manager/html|boaform|HNAP1|owa|autodiscover|ecp|remote/login|_profiler|telescope|debug|console)",
  "/(config|credentials|secrets?)\\.(json|ya?ml|xml|ini|bak|old)$", "\\.(sql|bak|old|swp|tar|gz|zip|7z|rar)$", "/etc/passwd", "/proc/self",
].join("|"), "i");

// Classic injection / traversal payloads, checked in the URL and query only
// (never request bodies, which legitimately hold free text and attachments).
const ATTACK_RES = [
  [/(\bunion\b[\s\S]{0,40}\bselect\b|\bselect\b[\s\S]{0,60}\bfrom\b[\s\S]{0,40}\b(information_schema|pg_catalog|users)\b|\bor\b\s+['"]?\d+['"]?\s*=\s*['"]?\d+|'\s*or\s*'[^']*'\s*=\s*'|;\s*(drop|truncate|alter)\s+table|\bpg_sleep\s*\(|\bsleep\s*\(\s*\d|benchmark\s*\(|waitfor\s+delay)/i, "SQL injection"],
  [/(<\s*script|javascript:|onerror\s*=|onload\s*=|<\s*img[^>]+src|<\s*svg[^>]*on\w+\s*=|document\.cookie|alert\s*\()/i, "Cross-site scripting (XSS)"],
  [/(\.\.\/|\.\.\\|%2e%2e(%2f|%5c|\/)|\/etc\/(passwd|shadow)|c:\\windows|\/proc\/self)/i, "Path traversal"],
  [/(\$\{jndi:|\$\{\s*(env|sys|java):)/i, "Log4Shell / JNDI injection"],
  [/(;|\||`|\$\()\s*(cat|wget|curl|bash|sh|nc|powershell)\b/i, "Command injection"],
];
function attackIn(req) {
  let raw = String(req.originalUrl || req.url || "");
  let dec = raw;
  try { dec = decodeURIComponent(raw.replace(/\+/g, " ")); } catch { /* malformed encoding is itself suspicious */ return "Malformed URL encoding"; }
  for (const [re, label] of ATTACK_RES) if (re.test(raw) || re.test(dec)) return label;
  return null;
}

// Does this request carry a currently valid sign-in token?
function hasValidToken(req) {
  const h = req.headers.authorization || "";
  if (!h.startsWith("Bearer ")) return false;
  try { jwt.verify(h.slice(7), config.jwt.secret); return true; } catch { return false; }
}

// Early middleware: identify the client, stop scanners and injection payloads,
// and enforce IP blocks on unauthenticated traffic.
export function idsMiddleware() {
  loadBlocks(true).catch(() => {});
  getConfig(true).catch(() => {});
  return async (req, res, next) => {
    const ip = clientIp(req);
    req.clientIp = ip;
    try {
      await Promise.all([loadBlocks(), getConfig()]);
      const p = String(req.path || "");
      const isApi = p.startsWith("/api/");
      const allow = isAllowlisted(ip);

      // 1. Scanner probes — answer 404 without touching the app.
      if (!isApi && p !== "/" && PROBE_RE.test(p)) {
        if (!allow) {
          const n = bump(`probe:${ip}`, RULES.probes.windowMin);
          record("scanner_probe", n >= 3 ? "medium" : "low", req, { detail: { count: n }, summary: `Vulnerability scan: request for ${p.slice(0, 80)}` }).catch(() => {});
          if (n >= RULES.probes.count) await autoBlock(req, ip, RULES.probes.blockMin, `${n} scanner probes in ${RULES.probes.windowMin} min`);
        }
        return res.status(404).type("text/plain").send("Not found");
      }

      // 2. Injection / traversal payloads in the URL.
      const attack = attackIn(req);
      if (attack) {
        if (!allow) {
          const n = bump(`attack:${ip}`, RULES.attackPatterns.windowMin);
          record("attack_pattern", "high", req, { detail: { pattern: attack, count: n }, summary: `${attack} attempt in request URL` }).catch(() => {});
          if (n >= RULES.attackPatterns.count) await autoBlock(req, ip, RULES.attackPatterns.blockMin, `${n} attack payloads in ${RULES.attackPatterns.windowMin} min (latest: ${attack})`);
        }
        return res.status(400).json({ error: "Request rejected." });
      }

      // 3. Blocked address: refuse unauthenticated API traffic (sign-in,
      //    password reset, token-less calls). The app shell still loads and
      //    staff with a valid session keep working.
      const blk = isApi && !allow ? isBlocked(ip) : null;
      if (blk && !hasValidToken(req)) {
        query(`UPDATE security_blocks SET hits = hits + 1 WHERE ip = $1`, [ip]).catch(() => {});
        return res.status(403).json({ error: "Sign-in from your network is temporarily blocked for security reasons. Please try again later or contact your administrator.", code: "IP_BLOCKED" });
      }
    } catch (e) { console.error("[ids] middleware error:", e.message); /* fail open: never take the app down */ }

    // 4. Watch the outcome: denied write attempts by signed-in users.
    res.on("finish", () => {
      if (res.statusCode === 403 && req.user && ["POST", "PUT", "PATCH", "DELETE"].includes(req.method)) {
        const key = `denied:${req.user.sub}`;
        const n = bump(key, RULES.deniedWrites.windowMin);
        if (n === RULES.deniedWrites.count) {
          record("privilege_probing", "high", req, { detail: { count: n }, summary: `${req.user.email} was refused ${n} changes in ${RULES.deniedWrites.windowMin} min (attempting actions beyond their role)` }).catch(() => {});
        } else if (n < RULES.deniedWrites.count) {
          record("access_denied", "low", req, { summary: `Refused ${req.method} ${String(req.originalUrl).split("?")[0]} for ${req.user.email} (${req.user.role})` }).catch(() => {});
        }
      }
    });
    next();
  };
}

/* ------------------------------ sign-in hooks ----------------------------- */
// Account lockout: failures for this email since its last success/unlock.
export async function accountLock(email) {
  const e = String(email || "").trim().toLowerCase();
  if (!e) return null;
  const { rows } = await query(
    `WITH reset AS (
       SELECT max(at) AS t FROM security_events
        WHERE lower(email) = $1 AND type IN ('login_success', 'account_unlocked')
     )
     SELECT count(*)::int AS n, max(at) AS last FROM security_events, reset
      WHERE lower(email) = $1 AND type = 'login_failed'
        AND at > now() - ($2 || ' minutes')::interval
        AND (reset.t IS NULL OR at > reset.t)`,
    [e, String(RULES.accountLockout.windowMin)],
  );
  const n = rows[0].n, last = rows[0].last;
  if (n < RULES.accountLockout.failures) return null;
  const until = new Date(new Date(last).getTime() + RULES.accountLockout.lockMin * 60_000);
  return until > new Date() ? { failures: n, until } : null;
}

export async function onLoginFailed(req, email, reason) {
  const ip = req.clientIp || clientIp(req);
  const e = String(email || "").trim().toLowerCase();
  const perIp = bump(`loginfail:${ip}`, RULES.ipFailures.windowMin);
  const accounts = bumpDistinct(`loginacct:${ip}`, e, RULES.ipFailures.windowMin);
  await record("login_failed", "low", req, { email: e, detail: { reason }, summary: `Failed sign-in for ${e} (${reason})` });
  const lock = await accountLock(e);
  if (lock && lock.failures === RULES.accountLockout.failures) {
    await record("account_locked", "high", req, { email: e, detail: { failures: lock.failures, until: lock.until }, summary: `Account ${e} locked for ${RULES.accountLockout.lockMin} min after ${lock.failures} failed sign-ins (possible password guessing)` });
  }
  if (!isAllowlisted(ip)) {
    if (accounts >= RULES.ipFailures.distinctAccounts) await autoBlock(req, ip, RULES.ipFailures.blockMin, `sign-in attempts against ${accounts} different accounts (password spraying)`);
    else if (perIp >= RULES.ipFailures.failures) await autoBlock(req, ip, RULES.ipFailures.blockMin, `${perIp} failed sign-ins in ${RULES.ipFailures.windowMin} min`);
  }
}

export async function onLoginSuccess(req, user) {
  const ip = req.clientIp || clientIp(req);
  const e = String(user.email || "").toLowerCase();
  // First sign-in from this network for this account?
  let fresh = false;
  try {
    const { rows } = await query(`SELECT 1 FROM security_events WHERE type = 'login_success' AND lower(email) = $1 AND ip = $2 LIMIT 1`, [e, ip]);
    const { rows: any } = await query(`SELECT 1 FROM security_events WHERE type = 'login_success' AND lower(email) = $1 LIMIT 1`, [e]);
    fresh = !rows.length && any.length > 0;
  } catch { /* ignore */ }
  const privileged = ["admin", "hr", "finance"].includes(user.role);
  await record("login_success", "info", req, { email: e, detail: { role: user.role, newNetwork: fresh } });
  if (fresh) await record("new_network_login", privileged ? "medium" : "info", req, { email: e, detail: { role: user.role }, summary: `${e} (${user.role}) signed in from a network not seen before for this account` });
}

// Tampered / forged token (not merely expired).
export async function onBadToken(req, err) {
  if (!err || err.name === "TokenExpiredError") return;
  const ip = req.clientIp || clientIp(req);
  const n = bump(`badtoken:${ip}`, RULES.badTokens.windowMin);
  await record("token_tampering", "high", req, { detail: { error: String(err.message || err.name).slice(0, 120), count: n }, summary: "Request with a forged or tampered sign-in token" });
  if (n >= RULES.badTokens.count && !isAllowlisted(ip)) await autoBlock(req, ip, RULES.badTokens.blockMin, `${n} forged/tampered tokens`);
}

export async function onRateLimited(req, which) {
  await record("rate_limited", "medium", req, { detail: { limiter: which }, summary: `Rate limit hit (${which})` });
}

// Audit hook for sensitive changes made by signed-in users.
export async function audit(req, type, severity, summary, detail = {}) {
  await record(type, severity, req, { detail, summary });
}
export async function onRecordDeleted(req, table, id) {
  if (!req.user) return;
  const n = bump(`delete:${req.user.sub}`, RULES.massDelete.windowMin);
  await record("record_deleted", "info", req, { detail: { table, id }, summary: `${table} ${id} deleted by ${req.user.email}` });
  if (n === RULES.massDelete.count) {
    await record("mass_deletion", "critical", req, { detail: { count: n }, summary: `${req.user.email} deleted ${n} records in ${RULES.massDelete.windowMin} min — possible sabotage or a compromised account` });
  }
}

/* -------------------------------- retention ------------------------------- */
export function startHousekeeping() {
  const run = async () => {
    try {
      await query(`DELETE FROM security_events WHERE at < now() - ($1 || ' days')::interval`, [String(RULES.retentionDays)]);
      await query(`DELETE FROM security_blocks WHERE expires_at IS NOT NULL AND expires_at < now() - interval '7 days'`);
    } catch (e) { console.error("[ids] housekeeping:", e.message); }
  };
  setTimeout(run, 30_000).unref();
  setInterval(run, 6 * 60 * 60_000).unref();
}
