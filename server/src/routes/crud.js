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
  bank_approvals: "BAPP",
};

const genId = (table) => {
  const prefix = PREFIXES[table] || "REC";
  const rand = Date.now().toString(36).toUpperCase().slice(-5) + Math.floor(Math.random() * 90 + 10);
  return `${prefix}-${rand}`;
};

// ---- Role / ownership policy ----------------------------------------------
const MGMT = new Set(["admin", "hr", "finance"]);
const isMgmt = (req) => MGMT.has(req.user && req.user.role);

// Tables a staff user may read, limited to rows they own. "__self__" means the
// employee record whose id equals their empId; otherwise the named doc field
// must equal their empId.
const OWN_FIELD = { employees: "__self__", leave: "empId", attendance: "empId", advances: "empId", appraisals: "empId" };
// Non-sensitive configuration a staff user may read in full.
const STAFF_CONFIG_READ = new Set(["ledger_columns"]);
// Tables a staff user may create a row in (ownership is forced to their empId).
const STAFF_CREATE = new Set(["leave", "attendance", "advances"]);
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
        } else if (OWN_FIELD[table]) {
          recs = recs.filter((r) => owns(table, r, empId));
        } else if (!STAFF_CONFIG_READ.has(table)) {
          recs = []; // nothing of this collection is a staff user's business
        }
      }
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
