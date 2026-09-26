// Generic CRUD router for the id + JSONB `doc` collections. Table names are a
// fixed whitelist (never interpolated from user input). The API returns each
// record as { ...doc, id } — the exact shape the web client already consumes.
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

export function crudRouter(table) {
  const router = Router();
  router.use(requireAuth);

  // LIST
  router.get("/", async (req, res, next) => {
    try {
      const { rows } = await query(`SELECT id, doc FROM ${table} ORDER BY created_at ASC`);
      res.json(rows.map(rowToRecord));
    } catch (e) { next(e); }
  });

  // GET one
  router.get("/:id", async (req, res, next) => {
    try {
      const { rows } = await query(`SELECT id, doc FROM ${table} WHERE id = $1`, [req.params.id]);
      if (!rows.length) return res.status(404).json({ error: "Record not found." });
      res.json(rowToRecord(rows[0]));
    } catch (e) { next(e); }
  });

  // CREATE
  router.post("/", async (req, res, next) => {
    try {
      const body = req.body && typeof req.body === "object" ? req.body : {};
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
      const patch = req.body && typeof req.body === "object" ? req.body : {};
      delete patch.id;
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

  // DELETE
  router.delete("/:id", async (req, res, next) => {
    try {
      const { rowCount } = await query(`DELETE FROM ${table} WHERE id = $1`, [req.params.id]);
      if (!rowCount) return res.status(404).json({ error: "Record not found." });
      res.json({ id: req.params.id, deleted: true });
    } catch (e) { next(e); }
  });

  return router;
}
