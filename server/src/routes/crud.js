// Generic CRUD router for the id + JSONB `doc` collections. Table names are a
// fixed whitelist (never interpolated from user input). The API returns each
// record as { ...doc, id } — the exact shape the web client already consumes.
//
// Authorization model:
//   • admin — full CRUD on every collection.
//   • hr / finance ("management") — CRUD where their live role (Settings ->
//     Roles & Permissions) allows it; elsewhere the staff self-service rules
//     below apply, and roles without Payroll see no one else's pay figures.
//   • staff — self-service only: they may read their OWN records, create their
//     own leave / attendance / advance requests, and submit profile-change
//     drafts. They can never read or write other people's data, and payroll
//     runs are reshaped to expose only the staff member's own row.
import { Router } from "express";
import { query } from "../db.js";
import { requireAuth } from "../middleware/auth.js";

const rowToRecord = (r) => ({ ...r.doc, id: r.id });

// prefix for generated ids, per resource
const PREFIXES = {
  employees: "GLA", leave: "LR", attendance: "AT", appraisals: "AP",
  ledger_columns: "col", payroll_runs: "PR", suppliers: "SUP",
  supplier_schedule: "SL", supplier_runs: "SPR", advances: "ADV",
  stock_items: "STK", stock_movements: "MOV", stock_closings: "CLS",
  bank_approvals: "BAPP", requisitions: "REQ", quotations: "QUO",
};

const genId = (table) => {
  const prefix = PREFIXES[table] || "REC";
  const rand = Date.now().toString(36).toUpperCase().slice(-5) + Math.floor(Math.random() * 90 + 10);
  return `${prefix}-${rand}`;
};

// ---- Role / ownership policy ----------------------------------------------
const MGMT = new Set(["admin", "hr", "finance"]);
const isMgmt = (req) => MGMT.has(req.user && req.user.role);

// ---- Live role permissions (Settings -> Roles & Permissions) ---------------
// Management users (hr / finance) only get management powers on a collection
// when their LIVE role allows it; otherwise they fall back to the same
// self-service rules as staff (own records only). Admin is always full access.
// Absent keys count as allowed, matching the web client's can()/canDo().
let rolesCache = { at: 0, roles: null };
export function resetRolesCache() { rolesCache = { at: 0, roles: null }; }
export async function liveRole(roleId) {
  const now = Date.now();
  if (!rolesCache.roles || now - rolesCache.at > 10000) {
    try {
      const { rows } = await query(`SELECT value FROM settings WHERE key = 'app'`);
      const r = rows[0] && rows[0].value && rows[0].value.roles;
      rolesCache = { at: now, roles: Array.isArray(r) ? r : [] };
    } catch { rolesCache = { at: now, roles: rolesCache.roles || [] }; }
  }
  return rolesCache.roles.find((x) => x && x.id === roleId) || null;
}
export const permits = (role, gate) => !role || !gate || ((role[gate[0]] || {})[gate[1]] !== false);
// Without these, a management user reads the collection like staff would.
const READ_GATE = { payroll_runs: ["modules", "payroll"], quotations: ["modules", "quotations"] };
// Without these, a management user writes the collection like staff would.
const WRITE_GATE = {
  employees: ["actions", "editEmployees"],
  leave: ["actions", "approveLeave"],
  payroll_runs: ["actions", "processPayroll"],
  ledger_columns: ["actions", "processPayroll"],
  advances: ["actions", "manageAdvances"],
  attendance: ["actions", "manageAttendance"],
  suppliers: ["actions", "manageSuppliers"],
  supplier_schedule: ["actions", "manageSuppliers"],
  stock_items: ["actions", "manageStock"],
  stock_movements: ["actions", "manageStock"],
  stock_closings: ["actions", "manageStock"],
  quotations: ["modules", "quotations"],
};
// Does this user act with management powers on `table` for `mode`?
async function mgmtFor(req, table, mode) {
  if (!isMgmt(req)) return false;
  if (req.user.role === "admin") return true;
  const role = await liveRole(req.user.role);
  if (mode === "delete") return permits(role, ["actions", "deleteRecords"]) && permits(role, WRITE_GATE[table]);
  if (mode === "read") return permits(role, READ_GATE[table]);
  return permits(role, WRITE_GATE[table]) && permits(role, READ_GATE[table]);
}
// Salary is payroll data: roles without the Payroll module don't receive other
// people's pay figures inside employee records.
async function seesPay(req) {
  if (!isMgmt(req) || req.user.role === "admin") return isMgmt(req);
  return permits(await liveRole(req.user.role), ["modules", "payroll"]);
}
function stripPay(rec, empId) {
  if (!rec || rec.id === empId) return rec;
  const { grossSalary, custom, ...rest } = rec;
  if (rest.terms && typeof rest.terms === "object") { const { entrySalary, ...t } = rest.terms; rest.terms = t; }
  return rest;
}

// Purchase orders: anyone other than HR/Admin (e.g. Finance) prepares POs for
// HR & Admin approval — their create/edit always lands as "pending_approval".
// Only HR/Admin issue (approve) or reject; the approval is stamped here.
async function shapePurchaseOrder(req, patch, existing) {
  const now = new Date().toISOString();
  const approver = isHrAdmin(req);
  const out = { ...patch };
  if (!approver) {
    delete out.approval;
    out.status = "pending_approval";
    out.rejection = null;
    out.approval = null;
    out.submittedAt = now;
    return out;
  }
  if (out.status === "issued" && !(existing && existing.status === "issued")) {
    out.approval = { by: req.user.empId || "", name: req.user.name || (out.approval && out.approval.name) || "HR & Admin", at: now };
    out.rejection = null;
  }
  if (out.status === "rejected") {
    const r = out.rejection || {};
    out.rejection = { by: req.user.empId || "", name: req.user.name || r.name || "HR & Admin", at: now, reason: String(r.reason || "").slice(0, 500) };
  }
  return out;
}

// Final (second-level) requisition approvers: HR & Admin only.
const isHrAdmin = (req) => ["admin", "hr"].includes(req.user && req.user.role);
// First-level requisition approver: any employee flagged isSupervisor (looked up live).
async function actorIsSupervisor(req) {
  if (!req.user || !req.user.empId) return false;
  try {
    const { rows } = await query(`SELECT doc FROM employees WHERE id = $1`, [req.user.empId]);
    return !!(rows[0] && rows[0].doc && rows[0].doc.isSupervisor);
  } catch { return false; }
}
// Can this employee give first-level approval on this requisition? It uses the
// approver pool snapshotted on the requisition (any one of several assigned
// supervisors may act, so a request isn't stuck when one is away). When no pool
// was recorded, it falls back to "any flagged supervisor". Never the requester.
function canSuperviseRec(rec, empId, isSup) {
  if (!empId || !rec || rec.requesterId === empId) return false;
  const pool = Array.isArray(rec.supervisorIds) ? rec.supervisorIds : [];
  if (pool.length) return pool.includes(empId);
  return !!isSup;
}
const pick = (o, keys) => Object.fromEntries(keys.filter((k) => k in o).map((k) => [k, o[k]]));
// Drop inline file bytes (dataUrl) from a requisition's documents for list views,
// keeping only the metadata needed to show "N files" and the file names.
const stripReqDocs = (r) => (Array.isArray(r.documents) && r.documents.length)
  ? { ...r, documents: r.documents.map((d) => ({ name: d.name, size: d.size, type: d.type || "" })) }
  : r;

// Tables a staff user may read, limited to rows they own. "__self__" means the
// employee record whose id equals their empId; otherwise the named doc field
// must equal their empId.
const OWN_FIELD = { employees: "__self__", leave: "empId", attendance: "empId", advances: "empId", appraisals: "empId", requisitions: "requesterId" };
// Non-sensitive configuration a staff user may read in full.
const STAFF_CONFIG_READ = new Set(["ledger_columns"]);
// Tables a staff user may create a row in (ownership is forced to their empId).
const STAFF_CREATE = new Set(["leave", "attendance", "advances", "requisitions"]);
// Fields a staff user may change on their OWN row. undefined => no updates
// allowed; a Set => only those fields; null => any field on their own row.
const STAFF_UPDATE_FIELDS = {
  // "Update My Details" saves straight to the record: the self-editable profile
  // fields (never salary, role, department, job title or status) plus the
  // change log. Mirrors PROFILE_*_FIELDS in the web client.
  employees: new Set([
    "firstName", "lastName", "gender", "dob", "nationalId", "maritalStatus", "religion", "disability", "nationality",
    "phone", "email", "address", "fileNumber", "tin", "nssfNumber", "bankName", "bankAccount", "bankBranch",
    "emergencyName", "emergencyRelation", "emergencyPhone", "nextOfKinName", "nextOfKinDetails",
    "origin", "residence", "contact",
    "academicQualifications", "bankDetails", "employmentHistory", "professionalSpecialization", "professionalMembership", "children", "nextOfKin",
    "profileDraft", "profileStatus", "profileSubmittedAt", "profileUpdatedAt", "profileChanges",
  ]),
  leave: new Set(["returnedAt"]),
  attendance: null,
};

const owns = (table, rec, empId) => {
  const f = OWN_FIELD[table];
  if (!f || !empId) return false;
  return f === "__self__" ? rec.id === empId : rec[f] === empId;
};

// Reshape a record so a staff user never sees other people's data inside it.
function shapeForStaff(table, rec, empId) {
  if (table === "payroll_runs" || table === "supplier_runs") {
    const rows = Array.isArray(rec.rows) ? rec.rows.filter((r) => r.empId === empId) : [];
    return { ...rec, rows, totals: null };
  }
  return rec;
}

// ---- Requisitions: dedicated create + approval-transition handlers ---------
// Ownership and approval state are stamped server-side, never trusted from the
// client, so no one can self-approve or forge another person's request.
async function createRequisition(req, res, next) {
  try {
    const empId = req.user.empId;
    const body = req.body && typeof req.body === "object" ? req.body : {};
    const emp = await query(`SELECT doc FROM employees WHERE id = $1`, [empId]);
    const e = (emp.rows[0] && emp.rows[0].doc) || {};
    const now = new Date().toISOString();
    // Finance Officers' requisitions have ONE approval level: straight to HR & Admin.
    const financeDirect = req.user.role === "finance";
    const status = body.status === "draft" ? "draft" : (financeDirect ? "pending_admin" : "pending_supervisor");
    const requesterName = body.requesterName || `${e.firstName || ""} ${e.lastName || ""}`.trim();
    const doc = {
      requesterId: empId,                 // forced to the authenticated user
      requesterName,
      designation: body.designation || e.jobTitle || "",
      department: body.department || e.department || "",
      location: body.location || null,
      subject: body.subject || "",
      narrative: body.narrative || "",
      currency: body.currency || "UGX",
      lineItems: Array.isArray(body.lineItems) ? body.lineItems.map((li) => ({ description: li.description || "", qty: Number(li.qty) || 0, rate: Number(li.rate) || 0 })) : [],
      documents: Array.isArray(body.documents) ? body.documents.slice(0, 12).map((d) => ({ name: String(d.name || "file"), size: Number(d.size) || 0, type: String(d.type || ""), dataUrl: typeof d.dataUrl === "string" ? d.dataUrl : "" })) : [],
      supervisorIds: financeDirect ? [] : (Array.isArray(e.supervisorIds) ? e.supervisorIds : []),   // approver pool from the requester's profile (authoritative)
      route: financeDirect ? "finance_direct" : "standard",
      status,                             // draft, pending_supervisor, or pending_admin (Finance)
      supervisor: null, admin: null, rejection: null,
      history: status !== "draft" ? [{ at: now, by: empId, byName: requesterName, action: "submitted", note: financeDirect ? "Finance request — sent straight to HR & Admin for final approval." : "" }] : [],
      createdAt: now, updatedAt: now,
    };
    const id = body.id || genId("requisitions");
    const { rows } = await query(`INSERT INTO requisitions (id, doc) VALUES ($1, $2) RETURNING id, doc`, [id, JSON.stringify(doc)]);
    res.status(201).json(rowToRecord(rows[0]));
  } catch (e) {
    if (e.code === "23505") return res.status(409).json({ error: "A requisition with that id already exists." });
    next(e);
  }
}

async function updateRequisition(req, res, next) {
  try {
    const { rows } = await query(`SELECT id, doc FROM requisitions WHERE id = $1`, [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: "Requisition not found." });
    const rec = { ...rows[0].doc, id: rows[0].id };
    const empId = req.user.empId;
    const name = req.user.name || "";
    const body = req.body && typeof req.body === "object" ? req.body : {};
    const now = new Date().toISOString();
    const hrAdmin = isHrAdmin(req);
    const owner = rec.requesterId === empId;
    const sup = await actorIsSupervisor(req);
    const canSup = canSuperviseRec(rec, empId, sup);   // may give first-level approval on THIS request
    const target = body.status;
    const note = String(body.note || (body.rejection && body.rejection.reason) || "").slice(0, 1000);
    const editable = (b) => pick(b, ["subject", "narrative", "location", "lineItems", "documents", "currency"]);
    const hist = (action, n) => [...(rec.history || []), { at: now, by: empId, byName: name, action, note: n != null ? n : (action === "submitted" ? "" : note) }];
    const reqdTotal = (rec.lineItems || []).reduce((a, li) => a + (Number(li.qty) || 0) * (Number(li.rate) || 0), 0);
    const parseAmt = (v) => { const x = Number(v); return Number.isFinite(x) && x >= 0 ? Math.round(x) : null; };

    let patch = null;
    if (owner && rec.status === "draft" && (!target || target === "draft")) {
      patch = { ...editable(body), updatedAt: now };                                   // owner edits own draft
    } else if (owner && rec.status === "draft" && (target === "pending_supervisor" || target === "pending_admin")) {
      // Owner submits a draft; Finance requests skip the supervisor stage.
      const direct = rec.route === "finance_direct" || req.user.role === "finance";
      patch = { ...editable(body), status: direct ? "pending_admin" : "pending_supervisor", ...(direct ? { route: "finance_direct", supervisorIds: [] } : {}), updatedAt: now, history: hist("submitted") };
    } else if (canSup && rec.status === "pending_supervisor" && target === "pending_admin") {
      patch = { status: "pending_admin", supervisor: { id: empId, name, at: now }, updatedAt: now, history: hist("supervisor_approved") };
    } else if (canSup && rec.status === "pending_supervisor" && target === "rejected") {
      patch = { status: "rejected", rejection: { by: empId, byName: name, at: now, reason: note, stage: "supervisor" }, updatedAt: now, history: hist("supervisor_rejected") };
    } else if (hrAdmin && rec.status === "pending_admin" && target === "approved") {
      // HR & Admin may approve the full requested amount or adjust it down/up.
      const amt = ("approvedAmount" in body) ? parseAmt(body.approvedAmount) : null;
      const adjusted = amt != null && amt !== reqdTotal;
      const n = adjusted ? `Amount adjusted from UGX ${reqdTotal.toLocaleString()} to UGX ${amt.toLocaleString()}${note ? " — " + note : ""}` : note;
      patch = {
        status: "approved", admin: { id: empId, name, at: now }, approvedAmount: amt,
        adjustment: adjusted ? { by: empId, byName: name, at: now, from: reqdTotal, to: amt, reason: note } : (rec.adjustment || null),
        updatedAt: now, history: hist("admin_approved", n),
      };
    } else if (hrAdmin && rec.status === "pending_admin" && target === "rejected") {
      patch = { status: "rejected", rejection: { by: empId, byName: name, at: now, reason: note, stage: "admin" }, updatedAt: now, history: hist("admin_rejected") };
    } else if (hrAdmin && rec.status === "approved" && target === "adjust") {
      // HR & Admin correct the approved amount after the fact.
      const amt = parseAmt(body.approvedAmount);
      if (amt == null) return res.status(400).json({ error: "Provide a valid approved amount." });
      const adjusted = amt !== reqdTotal;
      patch = {
        approvedAmount: amt,
        adjustment: adjusted ? { by: empId, byName: name, at: now, from: reqdTotal, to: amt, reason: note } : null,
        updatedAt: now, history: hist("amount_adjusted", `Approved amount set to UGX ${amt.toLocaleString()}${note ? " — " + note : ""}`),
      };
    } else if (isMgmt(req) && rec.status === "approved" && target === "paid") {
      // Finance / management close out an approved requisition as a completed
      // payment once it has been disbursed.
      patch = {
        status: "paid", payment: { by: empId, byName: name, at: now },
        updatedAt: now, history: hist("marked_paid", note || "Payment disbursed — requisition closed."),
      };
    }
    if (!patch) return res.status(403).json({ error: "You can't make that change to this requisition." });
    const merged = { ...rec, ...patch };
    const { id: _omit, ...doc } = merged;
    const out = await query(`UPDATE requisitions SET doc = $2::jsonb, updated_at = now() WHERE id = $1 RETURNING id, doc`, [req.params.id, JSON.stringify(doc)]);
    res.json(rowToRecord(out.rows[0]));
  } catch (e) { next(e); }
}

export function crudRouter(table) {
  const router = Router();
  router.use(requireAuth);

  // LIST
  router.get("/", async (req, res, next) => {
    try {
      const { rows } = await query(`SELECT id, doc FROM ${table} ORDER BY created_at ASC`);
      let recs = rows.map(rowToRecord);
      const asMgmt = await mgmtFor(req, table, "read");
      if (isMgmt(req) && !asMgmt && table === "payroll_runs") {
        // Management without Payroll: keep each run (month/status drive advance
        // recovery) but only their own row inside it.
        recs = recs.map((r) => shapeForStaff(table, r, req.user.empId));
      } else if (isMgmt(req) && !asMgmt) {
        recs = []; // a module this role doesn't have (e.g. Quotations)
      } else if (!isMgmt(req)) {
        const empId = req.user.empId;
        if (table === "payroll_runs") {
          recs = recs.map((r) => shapeForStaff(table, r, empId)).filter((r) => (r.rows || []).length);
        } else if (table === "requisitions") {
          // Own requests, plus any request in this supervisor's pool across its
          // whole lifecycle — so they can review pending ones AND reach approved
          // ones to print the payment voucher.
          const sup = await actorIsSupervisor(req);
          recs = recs.filter((r) => r.requesterId === empId || canSuperviseRec(r, empId, sup));
        } else if (OWN_FIELD[table]) {
          recs = recs.filter((r) => owns(table, r, empId));
        } else if (!STAFF_CONFIG_READ.has(table)) {
          recs = []; // nothing of this collection is a staff user's business
        }
      }
      // Keep requisition list payloads light: send attachment metadata only, not
      // the inline file bytes. The detail view fetches the full record to view them.
      if (table === "requisitions") recs = recs.map(stripReqDocs);
      if (table === "employees" && isMgmt(req) && !(await seesPay(req))) recs = recs.map((r) => stripPay(r, req.user.empId));
      res.json(recs);
    } catch (e) { next(e); }
  });

  // GET one
  router.get("/:id", async (req, res, next) => {
    try {
      const { rows } = await query(`SELECT id, doc FROM ${table} WHERE id = $1`, [req.params.id]);
      if (!rows.length) return res.status(404).json({ error: "Record not found." });
      let rec = rowToRecord(rows[0]);
      if (isMgmt(req) && !(await mgmtFor(req, table, "read"))) {
        if (table === "payroll_runs") rec = shapeForStaff(table, rec, req.user.empId);
        else return res.status(403).json({ error: "You do not have permission to view this record." });
      }
      if (table === "employees" && isMgmt(req) && !(await seesPay(req))) rec = stripPay(rec, req.user.empId);
      if (!isMgmt(req)) {
        const empId = req.user.empId;
        if (table === "payroll_runs") rec = shapeForStaff(table, rec, empId);
        else if (table === "requisitions") {
          const sup = await actorIsSupervisor(req);
          if (!(rec.requesterId === empId || canSuperviseRec(rec, empId, sup)))
            return res.status(403).json({ error: "You do not have permission to view this record." });
        }
        else if (!STAFF_CONFIG_READ.has(table) && !owns(table, rec, empId)) {
          return res.status(403).json({ error: "You do not have permission to view this record." });
        }
      }
      res.json(rec);
    } catch (e) { next(e); }
  });

  // CREATE
  router.post("/", async (req, res, next) => {
    try {
      if (table === "requisitions") return createRequisition(req, res, next);
      const body = req.body && typeof req.body === "object" ? { ...req.body } : {};
      if (!(await mgmtFor(req, table, "write"))) {
        if (!STAFF_CREATE.has(table)) return res.status(403).json({ error: "You do not have permission to create this record." });
        body[OWN_FIELD[table]] = req.user.empId; // force the new row to belong to the caller
      }
      const id = body.id || genId(table);
      const shaped = table === "purchase_orders" ? await shapePurchaseOrder(req, body, null) : body;
      const { id: _omit, ...doc } = shaped;
      const { rows } = await query(
        `INSERT INTO ${table} (id, doc) VALUES ($1, $2) RETURNING id, doc`,
        [id, JSON.stringify(doc)],
      );
      res.status(201).json(rowToRecord(rows[0]));
    } catch (e) {
      if (e.code === "23505") return res.status(409).json({ error: "A record with that id already exists." });
      next(e);
    }
  });

  // UPDATE (merge patch into the existing doc)
  const update = async (req, res, next) => {
    try {
      if (table === "requisitions") return updateRequisition(req, res, next);
      let patch = req.body && typeof req.body === "object" ? { ...req.body } : {};
      delete patch.id;
      // No self-approval: only Admin may decide on their own advance or leave.
      if ((table === "advances" || table === "leave") && isMgmt(req) && req.user.role !== "admin"
          && ["status", "approvedAmount", "approvedMonths", "decidedBy", "decidedAt", "startMonth"].some((k) => k in patch)) {
        const cur = await query(`SELECT doc FROM ${table} WHERE id = $1`, [req.params.id]);
        if (cur.rows.length && cur.rows[0].doc && cur.rows[0].doc.empId === req.user.empId) {
          return res.status(403).json({ error: "You can't decide on your own request — HR & Admin will review it." });
        }
      }
      if (!(await mgmtFor(req, table, "write"))) {
        const empId = req.user.empId;
        const fields = STAFF_UPDATE_FIELDS[table];
        if (fields === undefined) return res.status(403).json({ error: "You do not have permission to modify this record." });
        const existing = await query(`SELECT id, doc FROM ${table} WHERE id = $1`, [req.params.id]);
        if (!existing.rows.length) return res.status(404).json({ error: "Record not found." });
        if (!owns(table, rowToRecord(existing.rows[0]), empId)) {
          return res.status(403).json({ error: "You do not have permission to modify this record." });
        }
        if (fields) { // restrict to the permitted fields
          patch = Object.fromEntries(Object.entries(patch).filter(([k]) => fields.has(k)));
          if (!Object.keys(patch).length) return res.status(403).json({ error: "None of those fields can be changed." });
        }
        if (OWN_FIELD[table] && OWN_FIELD[table] !== "__self__") delete patch[OWN_FIELD[table]]; // can't reassign ownership
      }
      if (table === "purchase_orders") {
        const cur = await query(`SELECT doc FROM purchase_orders WHERE id = $1`, [req.params.id]);
        patch = await shapePurchaseOrder(req, patch, cur.rows[0] ? cur.rows[0].doc : null);
      }
      const { rows } = await query(
        `UPDATE ${table}
            SET doc = doc || $2::jsonb, updated_at = now()
          WHERE id = $1
      RETURNING id, doc`,
        [req.params.id, JSON.stringify(patch)],
      );
      if (!rows.length) return res.status(404).json({ error: "Record not found." });
      res.json(rowToRecord(rows[0]));
    } catch (e) { next(e); }
  };
  router.put("/:id", update);
  router.patch("/:id", update);

  // DELETE (management only)
  router.delete("/:id", async (req, res, next) => {
    try {
      if (!(await mgmtFor(req, table, "delete"))) return res.status(403).json({ error: "You do not have permission to delete this record." });
      const { rowCount } = await query(`DELETE FROM ${table} WHERE id = $1`, [req.params.id]);
      if (!rowCount) return res.status(404).json({ error: "Record not found." });
      res.json({ id: req.params.id, deleted: true });
    } catch (e) { next(e); }
  });

  return router;
}
