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
import { data, normalizeEmployee } from "../data.js";

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

// Supplier payment schedule
export const suppliersApi = makeCrud("suppliers", "SUP");
// Processed supplier schedules (locked history)
export const supplierRunsApi = makeCrud("supplierRuns", "SPR");

// Salary advance requests
export const advancesApi = makeCrud("advances", "ADV");

// System settings (single object: company, payroll rates, roles, announcements)
export const settingsApi = {
  get: () => respond(data.settings),
  update: (patch) => { data.settings = { ...data.settings, ...patch }; return respond(data.settings); },
};

// Stock management
export const stockItemsApi = makeCrud("stockItems", "STK");
export const stockMovementsApi = makeCrud("stockMovements", "MOV");
export const stockClosingsApi = makeCrud("stockClosings", "CLS");
