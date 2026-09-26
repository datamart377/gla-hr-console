// db:migrate — applies migrations/*.sql in filename order, once each.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { pool } from "../src/db.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = path.join(__dirname, "..", "migrations");

async function main() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      filename   TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )`);

  const files = fs.readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith(".sql")).sort();
  const { rows } = await pool.query("SELECT filename FROM schema_migrations");
  const done = new Set(rows.map((r) => r.filename));

  let applied = 0;
  for (const file of files) {
    if (done.has(file)) { console.log(`• skip   ${file} (already applied)`); continue; }
    const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), "utf8");
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query(sql);
      await client.query("INSERT INTO schema_migrations (filename) VALUES ($1)", [file]);
      await client.query("COMMIT");
      console.log(`✓ apply  ${file}`);
      applied++;
    } catch (e) {
      await client.query("ROLLBACK");
      console.error(`✗ FAILED ${file}: ${e.message}`);
      throw e;
    } finally {
      client.release();
    }
  }
  console.log(applied ? `Applied ${applied} migration(s).` : "Database is up to date.");
  await pool.end();
}

main().catch((e) => { console.error("db:migrate failed:", e.message); process.exit(1); });
