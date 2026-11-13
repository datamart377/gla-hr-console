// Generic CRUD router for the id + JSONB `doc` collections. Table names are a
// fixed whitelist (never interpolated from user input). The API returns each
// record as { ...doc, id } — the exact shape the web client already consumes.
//
// Authorization model:
//   • admin / hr / finance ("management") — full CRUD on every collection.
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
  bank_approvals: "BAPP", requisitions: "REQ",
};

const genId = (table) => {
  const prefix = PREFIXES[table] || "REC";
  const rand = Date.now().toString(36).toUpperCase().slice(-5) + Math.floor(Math.random() * 90 + 10);
  return `${prefix}-${rand}`;
};

// ---- Role / ownership policy ----------------------------------------------
const MGMT = new Set(["admin", "hr", "finance"]);
const isMgmt = (req) => MGMT.has(req.user && req.user.role);
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
  employees: new Set(["profileDraft", "profileStatus", "profileSubmittedAt"]),
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
    const status = body.status === "draft" ? "draft" : "pending_supervisor";
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
      supervisorIds: Array.isArray(e.supervisorIds) ? e.supervisorIds : [],   // approver pool from the requester's profile (authoritative)
      status,                             // only draft or pending_supervisor on create
      supervisor: null, admin: null, rejection: null,
      history: status === "pending_supervisor" ? [{ at: now, by: empId, byName: requesterName, action: "submitted", note: "" }] : [],
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
    const hist = (action) => [...(rec.history || []), { at: now, by: empId, byName: name, action, note: action === "submitted" ? "" : note }];

    let patch = null;
    if (owner && rec.status === "draft" && (!target || target === "draft")) {
      patch = { ...editable(body), updatedAt: now };                                   // owner edits own draft
    } else if (owner && rec.status === "draft" && target === "pending_supervisor") {
      patch = { ...editable(body), status: "pending_supervisor", updatedAt: now, history: hist("submitted") }; // owner submits
    } else if (canSup && rec.status === "pending_supervisor" && target === "pending_admin") {
      patch = { status: "pending_admin", supervisor: { id: empId, name, at: now }, updatedAt: now, history: hist("supervisor_approved") };
    } else if (canSup && rec.status === "pending_supervisor" && target === "rejected") {
      patch = { status: "rejected", rejection: { by: empId, byName: name, at: now, reason: note, stage: "supervisor" }, updatedAt: now, history: hist("supervisor_rejected") };
    } else if (hrAdmin && rec.status === "pending_admin" && target === "approved") {
      patch = { status: "approved", admin: { id: empId, name, at: now }, updatedAt: now, history: hist("admin_approved") };
    } else if (hrAdmin && rec.status === "pending_admin" && target === "rejected") {
      patch = { status: "rejected", rejection: { by: empId, byName: name, at: now, reason: note, stage: "admin" }, updatedAt: now, history: hist("admin_rejected") };
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
      if (!isMgmt(req)) {
        const empId = req.user.empId;
        if (table === "payroll_runs") {
          recs = recs.map((r) => shapeForStaff(table, r, empId)).filter((r) => (r.rows || []).length);
        } else if (table === "requisitions") {
          // Own requests, plus anything awaiting first-level approval that THIS
          // supervisor is assigned to clear (any one of a request's assigned
          // supervisors can act on it).
          const sup = await actorIsSupervisor(req);
          recs = recs.filter((r) => r.requesterId === empId || (r.status === "pending_supervisor" && canSuperviseRec(r, empId, sup)));
        } else if (OWN_FIELD[table]) {
          recs = recs.filter((r) => owns(table, r, empId));
        } else if (!STAFF_CONFIG_READ.has(table)) {
          recs = []; // nothing of this collection is a staff user's business
        }
      }
      // Keep requisition list payloads light: send attachment metadata only, not
      // the inline file bytes. The detail view fetches the full record to view them.
      if (table === "requisitions") recs = recs.map(stripReqDocs);
      res.json(recs);
    } catch (e) { next(e); }
  });

  // GET one
  router.get("/:id", async (req, res, next) => {
    try {
      const { rows } = await query(`SELECT id, doc FROM ${table} WHERE id = $1`, [req.params.id]);
      if (!rows.length) return res.status(404).json({ error: "Record not found." });
      let rec = rowToRecord(rows[0]);
      if (!isMgmt(req)) {
        const empId = req.user.empId;
        if (table === "payroll_runs") rec = shapeForStaff(table, rec, empId);
        else if (table === "requisitions") {
          const sup = await actorIsSupervisor(req);
          if (!(rec.requesterId === empId || (rec.status === "pending_supervisor" && canSuperviseRec(rec, empId, sup))))
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
      if (!isMgmt(req)) {
        if (!STAFF_CREATE.has(table)) return res.status(403).json({ error: "You do not have permission to create this record." });
        body[OWN_FIELD[table]] = req.user.empId; // force the new row to belong to the caller
      }
      const id = body.id || genId(table);
      const { id: _omit, ...doc } = body;
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
      if (!isMgmt(req)) {
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
      if (!isMgmt(req)) return res.status(403).json({ error: "You do not have permission to delete this record." });
      const { rowCount } = await query(`DELETE FROM ${table} WHERE id = $1`, [req.params.id]);
      if (!rowCount) return res.status(404).json({ error: "Record not found." });
      res.json({ id: req.params.id, deleted: true });
    } catch (e) { next(e); }
  });

  return router;
}
