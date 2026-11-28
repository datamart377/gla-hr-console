/* -------------------------------------------------------------------------
   Fetch-shaped API client.

   In production this module would call the Express backend, e.g.

     const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:4000";
     export const employeesApi = {
       list: () => fetch(`${API_BASE}/api/employees`).then((r) => r.json()),
       ...
     };

   For this front-end demo prototype the same async surface is served from the
   in-memory store in ../data.js, so the app runs with no server. Each method
   returns a Promise and clones its payload, mirroring a network boundary —
   swapping in real `fetch` calls later requires no changes in App.jsx.
   ------------------------------------------------------------------------- */
import { data, normalizeEmployee, normalizeRequisition, normalizePurchaseOrder, normalizeQuotation, normalizeClient } from "../data.js";

const LATENCY = 130; // ms — simulate a network round-trip
const clone = (v) => JSON.parse(JSON.stringify(v));
const respond = (v) => new Promise((res) => setTimeout(() => res(clone(v)), LATENCY));

function makeCrud(key, prefix) {
  return {
    list: () => respond(data[key]),
    get: (id) => respond(data[key].find((x) => x.id === id) || null),
    create: (record) => {
      const id = record.id || `${prefix}-${Date.now().toString(36).toUpperCase().slice(-5)}${Math.floor(Math.random() * 90 + 10)}`;
      const row = { ...record, id };
      data[key] = [...data[key], row];
      return respond(row);
    },
    update: (id, patch) => {
      let updated = null;
      data[key] = data[key].map((x) => (x.id === id ? (updated = { ...x, ...patch, id }) : x));
      return respond(updated);
    },
    remove: (id) => {
      data[key] = data[key].filter((x) => x.id !== id);
      return respond({ id, deleted: true });
    },
  };
}

export const employeesApi = makeCrud("employees", "GLA");
// New/updated staff records are normalized to the full staff-file shape.
const _rawCreate = employeesApi.create;
employeesApi.create = (record) => _rawCreate(normalizeEmployee(record));
export const leaveApi = makeCrud("leave", "LR");
export const attendanceApi = makeCrud("attendance", "AT");
export const appraisalsApi = makeCrud("appraisals", "AP");

// Payroll is derived, not stored — it reads the current employee register.
export const payrollApi = {
  register: () => respond(data.employees.filter((e) => e.status !== "Terminated")),
};

// Custom ledger columns
export const ledgerColumnsApi = {
  list: () => respond(data.ledgerColumns || []),
  add: (col) => { const id = col.id || `col-${Date.now().toString(36)}`; const row = { ...col, id }; data.ledgerColumns = [...(data.ledgerColumns || []), row]; return respond(row); },
  remove: (id) => { data.ledgerColumns = (data.ledgerColumns || []).filter((c) => c.id !== id); return respond({ id }); },
};

// Processed monthly payroll runs (snapshots)
export const payrollRunsApi = makeCrud("payrollRuns", "PR");

// Suppliers master register (vendor master)
export const suppliersApi = makeCrud("suppliers", "SUP");
// Supplier payment schedule (draft lines referencing suppliers)
export const supplierScheduleApi = makeCrud("supplierSchedule", "SL");
// Processed supplier schedules (locked history)
export const supplierRunsApi = makeCrud("supplierRuns", "SPR");

// Bank report digital sign-off records (Director of Engineering → Managing Director)
export const bankApprovalsApi = makeCrud("bankApprovals", "BAPP");

// Field fund requisitions (two-level approval: Supervisor → HR & Admin)
export const requisitionsApi = makeCrud("requisitions", "REQ");
const _rawReqCreate = requisitionsApi.create;
requisitionsApi.create = (record) => _rawReqCreate(normalizeRequisition(record));
// Mirror the server's approval transitions so the offline demo stamps the
// approver, history and HR & Admin amount adjustments like the live backend.
// The acting user is passed in body._actor (ignored by the live server).
const _rawReqUpdate = requisitionsApi.update;
requisitionsApi.update = (id, body = {}) => {
  const rec = (data.requisitions || []).find((x) => x.id === id);
  const target = body.status;
  if (!rec || !["pending_admin", "approved", "rejected", "adjust"].includes(target)) return _rawReqUpdate(id, body);
  const now = new Date().toISOString();
  const actor = body._actor || {};
  const empId = actor.id || "", name = actor.name || "";
  const note = String(body.note || "").slice(0, 1000);
  const reqdTotal = (rec.lineItems || []).reduce((a, li) => a + (Number(li.qty) || 0) * (Number(li.rate) || 0), 0);
  const parseAmt = (v) => { const x = Number(v); return Number.isFinite(x) && x >= 0 ? Math.round(x) : null; };
  const hist = (action, n) => [...(rec.history || []), { at: now, by: empId, byName: name, action, note: n != null ? n : note }];
  let patch;
  if (target === "pending_admin") {
    patch = { status: "pending_admin", supervisor: { id: empId, name, at: now }, history: hist("supervisor_approved"), updatedAt: now };
  } else if (target === "approved") {
    const amt = ("approvedAmount" in body) ? parseAmt(body.approvedAmount) : null;
    const adjusted = amt != null && amt !== reqdTotal;
    const n = adjusted ? `Amount adjusted from UGX ${reqdTotal.toLocaleString()} to UGX ${amt.toLocaleString()}${note ? " — " + note : ""}` : note;
    patch = { status: "approved", admin: { id: empId, name, at: now }, approvedAmount: amt, adjustment: adjusted ? { by: empId, byName: name, at: now, from: reqdTotal, to: amt, reason: note } : (rec.adjustment || null), history: hist("admin_approved", n), updatedAt: now };
  } else if (target === "adjust") {
    const amt = parseAmt(body.approvedAmount);
    const adjusted = amt != null && amt !== reqdTotal;
    patch = { approvedAmount: amt, adjustment: adjusted ? { by: empId, byName: name, at: now, from: reqdTotal, to: amt, reason: note } : null, history: hist("amount_adjusted", `Approved amount set to UGX ${(amt || 0).toLocaleString()}${note ? " — " + note : ""}`), updatedAt: now };
  } else { // rejected
    const stage = rec.status === "pending_supervisor" ? "supervisor" : "admin";
    patch = { status: "rejected", rejection: { by: empId, byName: name, at: now, reason: note, stage }, history: hist(stage === "supervisor" ? "supervisor_rejected" : "admin_rejected"), updatedAt: now };
  }
  return _rawReqUpdate(id, patch);
};

// Purchase orders (issued to suppliers against their quotations)
export const quotationsApi = makeCrud("quotations", "QUO");
const _rawQuoteCreate = quotationsApi.create;
quotationsApi.create = (record) => _rawQuoteCreate(normalizeQuotation(record));
export const clientsApi = makeCrud("clients", "CLI");
const _rawClientCreate = clientsApi.create;
clientsApi.create = (record) => _rawClientCreate(normalizeClient(record));
// Tenancy (Administrator's personal apartments)
export const tenancyMetaApi = makeCrud("tenancyMeta", "TM");
export const tenancyPropertiesApi = makeCrud("tenancyProperties", "PRP");
export const tenancyTenantsApi = makeCrud("tenancyTenants", "TEN");
export const tenancyLeasesApi = makeCrud("tenancyLeases", "LSE");
export const tenancyPaymentsApi = makeCrud("tenancyPayments", "PAY");
export const tenancyChargesApi = makeCrud("tenancyCharges", "CHG");
export const tenancyMaintenanceApi = makeCrud("tenancyMaintenance", "MNT");
export const purchaseOrdersApi = makeCrud("purchaseOrders", "PO");
const _rawPoCreate = purchaseOrdersApi.create;
purchaseOrdersApi.create = (record) => _rawPoCreate(normalizePurchaseOrder(record));

// Salary advance requests
export const advancesApi = makeCrud("advances", "ADV");

// System settings (single object: company, payroll rates, roles, announcements)
export const settingsApi = {
  get: () => respond(data.settings),
  update: (patch) => { data.settings = { ...data.settings, ...patch }; return respond(data.settings); },
};

// Notifications are a no-op in the standalone/demo build (no mail server).
export const notifyApi = {
  send: () => respond({ sent: false, mock: true }),
  status: () => respond({ configured: false }),
};

// Account management is a no-op in the standalone/demo build (no users table).
export const accountsApi = {
  list: () => respond([]),
  status: () => respond({ hasLogin: false }),
  invite: () => respond({ ok: true, created: true, emailed: false, mock: true }),
  setPassword: () => respond({ ok: true, created: true, mock: true }),
  syncEmail: () => respond({ synced: false, mock: true }),
  revoke: () => respond({ ok: true, revoked: true, mock: true }),
};

// Intrusion detection console — illustrative data in the offline demo.
const _ago = (min) => new Date(Date.now() - min * 60000).toISOString();
const _sec = {
  config: { autoBlock: true, emailAlerts: true, alertMinSeverity: "high", allowlist: [], extraRecipients: [] },
  blocks: [
    { ip: "185.220.101.34", reason: "sign-in attempts against 6 different accounts (password spraying)", created_at: _ago(38), expires_at: _ago(-22), created_by: "auto", hits: 14 },
    { ip: "45.148.10.77", reason: "5 scanner probes in 10 min", created_at: _ago(190), expires_at: _ago(-1250), created_by: "auto", hits: 3 },
  ],
  events: [
    { id: 9, at: _ago(12), type: "bank_details_changed", severity: "high", ip: "102.85.14.6", email: "p.wanyama@glassociates.co.ug", method: "PUT", path: "/api/employees/GLA-006", detail: { summary: "p.wanyama@glassociates.co.ug changed bank details for GLA-006 (their own record): account …7665 → …2231" }, acknowledged: false },
    { id: 8, at: _ago(38), type: "ip_blocked", severity: "high", ip: "185.220.101.34", detail: { summary: "Address 185.220.101.34 blocked for 1 hour(s): sign-in attempts against 6 different accounts (password spraying)" }, acknowledged: false },
    { id: 7, at: _ago(40), type: "login_failed", severity: "low", ip: "185.220.101.34", email: "admin@glassociates.co.ug", method: "POST", path: "/api/auth/login", detail: { summary: "Failed sign-in for admin@glassociates.co.ug (no such account)" }, acknowledged: false },
    { id: 6, at: _ago(41), type: "login_failed", severity: "low", ip: "185.220.101.34", email: "r.okello@glassociates.co.ug", method: "POST", path: "/api/auth/login", detail: { summary: "Failed sign-in for r.okello@glassociates.co.ug (wrong password)" }, acknowledged: false },
    { id: 5, at: _ago(95), type: "attack_pattern", severity: "high", ip: "91.92.241.10", method: "GET", path: "/api/employees?q=' or 1=1--", detail: { summary: "SQL injection attempt in request URL" }, acknowledged: false },
    { id: 4, at: _ago(190), type: "ip_blocked", severity: "high", ip: "45.148.10.77", detail: { summary: "Address 45.148.10.77 blocked for 24 hour(s): 5 scanner probes in 10 min" }, acknowledged: true, ack_by: "r.okello@glassociates.co.ug" },
    { id: 3, at: _ago(191), type: "scanner_probe", severity: "medium", ip: "45.148.10.77", method: "GET", path: "/.env", detail: { summary: "Vulnerability scan: request for /.env" }, acknowledged: true },
    { id: 2, at: _ago(300), type: "new_network_login", severity: "medium", ip: "196.43.180.2", email: "g.auma@glassociates.co.ug", method: "POST", path: "/api/auth/login", detail: { summary: "g.auma@glassociates.co.ug (finance) signed in from a network not seen before for this account" }, acknowledged: false },
    { id: 1, at: _ago(420), type: "login_success", severity: "info", ip: "102.85.14.6", email: "s.nakato@glassociates.co.ug", method: "POST", path: "/api/auth/login", detail: {}, acknowledged: false },
  ],
};
export const securityApi = {
  overview: () => {
    const sev = { info: 0, low: 0, medium: 0, high: 0, critical: 0 };
    _sec.events.forEach((e) => { sev[e.severity]++; });
    const byType = Object.entries(_sec.events.reduce((a, e) => (e.type === "login_success" ? a : { ...a, [e.type]: (a[e.type] || 0) + 1 }), {})).map(([type, n]) => ({ type, n }));
    return respond({
      monitoring: true, demo: true, config: _sec.config, mailReady: false,
      rules: { accountLockout: { failures: 5, windowMin: 15, lockMin: 15 }, ipFailures: { failures: 12, distinctAccounts: 4, windowMin: 15, blockMin: 60 }, probes: { count: 5, windowMin: 10, blockMin: 1440 }, attackPatterns: { count: 3, windowMin: 10, blockMin: 1440 }, badTokens: { count: 5, windowMin: 10, blockMin: 60 }, deniedWrites: { count: 10, windowMin: 10 }, massDelete: { count: 10, windowMin: 10 }, retentionDays: 90 },
      you: { ip: "102.85.14.6", source: "cloudflare", allowlisted: false },
      last24h: { bySeverity: sev, byType, topIps: [{ ip: "185.220.101.34", n: 9, serious: 1, last: _ago(38) }, { ip: "45.148.10.77", n: 6, serious: 1, last: _ago(190) }, { ip: "91.92.241.10", n: 1, serious: 1, last: _ago(95) }], trend: [] },
      unacknowledged: _sec.events.filter((e) => !e.acknowledged && ["high", "critical"].includes(e.severity)).length,
      blocks: _sec.blocks,
      locked: [{ email: "r.okello@glassociates.co.ug", failures: 5, until: _ago(-9) }],
    });
  },
  events: (p = {}) => {
    const order = ["info", "low", "medium", "high", "critical"];
    let l = _sec.events.slice();
    if (p.severity) l = l.filter((e) => order.indexOf(e.severity) >= order.indexOf(p.severity));
    if (p.unack === "1") l = l.filter((e) => !e.acknowledged);
    if (p.hideRoutine === "1") l = l.filter((e) => !["login_success", "record_deleted", "settings_changed", "password_reset_requested"].includes(e.type));
    if (p.type) l = l.filter((e) => e.type === p.type);
    if (p.ip) l = l.filter((e) => e.ip === p.ip);
    if (p.q) { const k = String(p.q).toLowerCase(); l = l.filter((e) => [e.email, e.ip, e.path, e.detail && e.detail.summary].join(" ").toLowerCase().includes(k)); }
    return respond(l);
  },
  ack: (b) => { _sec.events.forEach((e) => { if (b.all || (b.ids || []).includes(e.id)) e.acknowledged = true; }); return respond({ ok: true }); },
  block: (ip, minutes, reason) => { _sec.blocks.unshift({ ip, reason: reason || "Blocked manually", created_at: new Date().toISOString(), expires_at: minutes ? _ago(-minutes) : null, created_by: "you", hits: 0 }); return respond({ ok: true }); },
  unblock: (ip) => { _sec.blocks = _sec.blocks.filter((b) => b.ip !== ip); return respond({ ok: true }); },
  unlock: () => respond({ ok: true }),
  saveConfig: (c) => { _sec.config = { ..._sec.config, ...c }; return respond(_sec.config); },
  testAlert: () => respond({ sent: false, reason: "email_not_configured" }),
};

// Stock management
export const stockItemsApi = makeCrud("stockItems", "STK");
export const stockMovementsApi = makeCrud("stockMovements", "MOV");
export const stockClosingsApi = makeCrud("stockClosings", "CLS");

// Demo auth — matches a staff record by email; password is not checked in the
// mock (the live backend enforces it). Mirrors httpClient.authApi's surface.
export const authApi = {
  login: (email, _password, _remember) => {
    const e = data.employees.find((x) => (x.email || "").toLowerCase() === String(email || "").trim().toLowerCase());
    if (!e) return Promise.reject(new Error("No staff account matches that email."));
    if (e.status === "Terminated") return Promise.reject(new Error("Your access to IHRSM has ended because your employment record is closed. Please contact HR & Admin if you think this is a mistake."));
    const role = ({ "GLA-001": "admin", "GLA-002": "hr", "GLA-003": "finance" })[e.id] || e.role || "staff";
    return respond({ token: null, user: { id: e.id, email: e.email, name: `${e.firstName} ${e.lastName}`, role, empId: e.id } });
  },
  me: () => Promise.reject(new Error("No session")),
  logout: () => {},
  token: () => null,
  expiresAt: () => null,
  forgotPassword: () => respond({ ok: true, message: "If that email has an account, a password-reset link is on its way." }),
  resetPassword: () => Promise.reject(new Error("Password reset needs the live server (not available in the offline demo).")),
  changePassword: () => respond({ ok: true }),
};
