// db:create — creates the target database if it does not already exist.
// Connects to the maintenance "postgres" database to issue CREATE DATABASE.
import pg from "pg";
import { config } from "../src/config.js";

async function main() {
  // On managed hosts (e.g. Render) the database already exists — nothing to create.
  if (process.env.DATABASE_URL) {
    console.log("DATABASE_URL is set — using the managed database; skipping db:create.");
    return;
  }
  const admin = new pg.Client({
    host: config.db.host, port: config.db.port,
    user: config.db.user, password: config.db.password,
    database: "postgres",
  });
  await admin.connect();
  const exists = await admin.query("SELECT 1 FROM pg_database WHERE datname = $1", [config.db.database]);
  if (exists.rowCount) {
    console.log(`Database "${config.db.database}" already exists — nothing to do.`);
  } else {
    // Identifier can't be parameterised; it comes from trusted config, not user input.
    await admin.query(`CREATE DATABASE "${config.db.database}"`);
    console.log(`Created database "${config.db.database}".`);
  }
  await admin.end();
}

main().catch((e) => { console.error("db:create failed:", e.message); process.exit(1); });
