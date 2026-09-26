/* -------------------------------------------------------------------------
   Real HTTP API client — talks to the Express + PostgreSQL backend.

   This is a drop-in replacement for the in-memory ./client.js. It exposes the
   SAME named exports and the same async, promise-returning surface, so the app
   can switch from the mock to the live API without changing App.jsx.

   To use it:
     1. Run the backend (see ../../server/README.md).
     2. Create .env.local at the project root with:
          VITE_API_BASE=http://localhost:4000
     3. Point the app at this module — either change App.jsx's import from
        "./api/client.js" to "./api/httpClient.js", or re-export it from
        client.js when VITE_API_BASE is set.

   Auth: call authApi.login(email, password) once; the JWT is kept in
   localStorage and attached to every request as a Bearer token.
   ------------------------------------------------------------------------- */

const API_BASE = (import.meta.env && import.meta.env.VITE_API_BASE) || "http://localhost:4000";
const TOKEN_KEY = "ihrsm.token";

const getToken = () => { try { return localStorage.getItem(TOKEN_KEY); } catch { return null; } };
const setToken = (t) => { try { t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY); } catch { /* ignore */ } };

async function request(method, path, body) {
  const headers = { "Content-Type": "application/json" };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body != null ? JSON.stringify(body) : undefined,
  });
  if (res.status === 204) return null;
  const payload = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(payload.error || `Request failed (${res.status})`);
  return payload;
}

// A CRUD surface matching makeCrud() in the mock client.
function makeCrud(resource) {
  return {
    list: () => request("GET", `/api/${resource}`),
    get: (id) => request("GET", `/api/${resource}/${encodeURIComponent(id)}`),
    create: (record) => request("POST", `/api/${resource}`, record),
    update: (id, patch) => request("PATCH", `/api/${resource}/${encodeURIComponent(id)}`, patch),
    remove: (id) => request("DELETE", `/api/${resource}/${encodeURIComponent(id)}`),
  };
}

// ---- Auth ----
export const authApi = {
  login: async (email, password) => {
    const out = await request("POST", "/api/auth/login", { email, password });
    if (out && out.token) setToken(out.token);
    return out; // { token, user }
  },
  me: () => request("GET", "/api/auth/me"),
  logout: () => setToken(null),
  token: getToken,
};

// ---- Domain collections (paths match server/src/index.js) ----
export const employeesApi = makeCrud("employees");
export const leaveApi = makeCrud("leave");
export const attendanceApi = makeCrud("attendance");
export const appraisalsApi = makeCrud("appraisals");
export const ledgerColumnsApi = (() => {
  const c = makeCrud("ledger-columns");
  return { list: c.list, add: c.create, remove: c.remove };
})();
export const payrollRunsApi = makeCrud("payroll-runs");
export const suppliersApi = makeCrud("suppliers");
export const supplierScheduleApi = makeCrud("supplier-schedule");
export const supplierRunsApi = makeCrud("supplier-runs");
export const advancesApi = makeCrud("advances");
export const stockItemsApi = makeCrud("stock-items");
export const stockMovementsApi = makeCrud("stock-movements");
export const stockClosingsApi = makeCrud("stock-closings");
export const bankApprovalsApi = makeCrud("bank-approvals");

// Payroll register is derived server-side from employees in a full build; here
// it simply reads the employees collection to mirror the mock's shape.
export const payrollApi = {
  register: async () => (await employeesApi.list()).filter((e) => e.status !== "Terminated"),
};

export const settingsApi = {
  get: () => request("GET", "/api/settings"),
  update: (patch) => request("PUT", "/api/settings", patch),
};
