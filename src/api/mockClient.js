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
