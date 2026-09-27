/* -------------------------------------------------------------------------
   API client selector.

   - When VITE_API_BASE is set (e.g. in .env.local: VITE_API_BASE=http://localhost:4000),
     the app talks to the live Express + PostgreSQL backend via httpClient.js.
   - Otherwise it uses the in-memory mock (mockClient.js), so the standalone /
     GitHub Pages demo runs with no server.

   Both modules expose the same named exports, so App.jsx imports from here and
   never needs to know which one is active.
   ------------------------------------------------------------------------- */
import * as mock from "./mockClient.js";
import * as http from "./httpClient.js";

export const isLive = !!(import.meta.env && import.meta.env.VITE_API_BASE);
const impl = isLive ? http : mock;

export const authApi = impl.authApi;
export const employeesApi = impl.employeesApi;
export const leaveApi = impl.leaveApi;
export const attendanceApi = impl.attendanceApi;
export const appraisalsApi = impl.appraisalsApi;
export const payrollApi = impl.payrollApi;
export const ledgerColumnsApi = impl.ledgerColumnsApi;
export const payrollRunsApi = impl.payrollRunsApi;
export const suppliersApi = impl.suppliersApi;
export const supplierScheduleApi = impl.supplierScheduleApi;
export const supplierRunsApi = impl.supplierRunsApi;
export const bankApprovalsApi = impl.bankApprovalsApi;
export const advancesApi = impl.advancesApi;
export const settingsApi = impl.settingsApi;
export const stockItemsApi = impl.stockItemsApi;
export const stockMovementsApi = impl.stockMovementsApi;
export const stockClosingsApi = impl.stockClosingsApi;
