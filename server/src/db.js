// PostgreSQL connection pool (node-postgres). No ORM — plain SQL everywhere.
import pg from "pg";
import { config } from "./config.js";

export const pool = new pg.Pool({
  host: config.db.host,
  port: config.db.port,
  user: config.db.user,
  password: config.db.password,
  database: config.db.database,
  max: 10,
  idleTimeoutMillis: 30000,
});

pool.on("error", (err) => {
  console.error("Unexpected PostgreSQL pool error:", err.message);
});

// Small helper: run a query and return rows.
export const query = (text, params) => pool.query(text, params);
