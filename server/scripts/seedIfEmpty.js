// Seeds the demo data only when the database is empty. Used on deploy so the
// first build populates data but later redeploys never overwrite live data.
// Run migrations first.
import { pool } from "../src/db.js";
import { doSeed } from "./seed.js";

async function main() {
  try {
    const { rows } = await pool.query("SELECT count(*)::int AS n FROM employees");
    if (rows[0].n === 0) {
      console.log("Database is empty — seeding demo data.");
      await doSeed();
    } else {
      console.log(`Database already has ${rows[0].n} employees — skipping seed.`);
    }
  } catch (e) {
    console.error("seedIfEmpty failed:", e.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

main();
