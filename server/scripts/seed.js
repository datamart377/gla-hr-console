// db:seed — loads the demo dataset (shared with the web app) into PostgreSQL
// and creates login accounts for the demo roles.
//
// Exposes doSeed() so other scripts (e.g. seedIfEmpty.js) can reuse it. Running
// this file directly performs a full (re)seed: it truncates the domain tables.
import { pathToFileURL } from "node:url";
import bcrypt from "bcryptjs";
import { pool } from "../src/db.js";
import { config } from "../src/config.js";
import { data } from "../../src/data.js";

// table -> data array key
const COLLECTIONS = {
  employees: "employees",
  leave: "leave",
  attendance: "attendance",
  appraisals: "appraisals",
  ledger_columns: "ledgerColumns",
  payroll_runs: "payrollRuns",
  suppliers: "suppliers",
  supplier_schedule: "supplierSchedule",
  supplier_runs: "supplierRuns",
  advances: "advances",
  stock_items: "stockItems",
  stock_movements: "stockMovements",
  stock_closings: "stockClosings",
  bank_approvals: "bankApprovals",
};

// Demo role mapping — matches the front-end's normalizeEmployee assignment.
const ROLE_BY_ID = { "GLA-001": "admin", "GLA-002": "hr", "GLA-003": "finance" };

export async function doSeed() {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    for (const [table, key] of Object.entries(COLLECTIONS)) {
      const rows = Array.isArray(data[key]) ? data[key] : [];
      await client.query(`TRUNCATE ${table}`);
      for (const rec of rows) {
        const { id, ...doc } = rec;
        const rid = id || `${table}-${Math.random().toString(36).slice(2, 8)}`;
        await client.query(`INSERT INTO ${table} (id, doc) VALUES ($1, $2::jsonb)`, [rid, JSON.stringify(doc)]);
      }
      console.log(`seeded ${rows.length.toString().padStart(3)}  ${table}`);
    }

    await client.query(
      `INSERT INTO settings (key, value) VALUES ('app', $1::jsonb)
       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()`,
      [JSON.stringify(data.settings || {})],
    );
    console.log("seeded   1  settings");

    const hash = await bcrypt.hash(config.seedPassword, 10);
    await client.query("TRUNCATE users RESTART IDENTITY");
    let users = 0;
    for (const e of data.employees || []) {
      if (!e.email) continue;
      const role = ROLE_BY_ID[e.id] || "staff";
      const name = `${e.firstName || ""} ${e.lastName || ""}`.trim();
      await client.query(
        `INSERT INTO users (email, password_hash, name, role, emp_id)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash, name = EXCLUDED.name, role = EXCLUDED.role, emp_id = EXCLUDED.emp_id`,
        [e.email.toLowerCase(), hash, name, role, e.id],
      );
      users++;
    }
    console.log(`seeded ${users.toString().padStart(3)}  users (password: "${config.seedPassword}")`);

    await client.query("COMMIT");
    console.log("\nSeed complete.");
    console.log("Demo logins (password: \"" + config.seedPassword + "\"):");
    console.log("  admin   → r.okello@glassociates.co.ug");
    console.log("  hr      → s.nakato@glassociates.co.ug");
    console.log("  finance → g.auma@glassociates.co.ug");
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}

// Run directly (`npm run db:seed`) — performs the seed and closes the pool.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  doSeed()
    .then(() => pool.end())
    .catch((e) => { console.error("db:seed failed:", e.message); pool.end().finally(() => process.exit(1)); });
}
