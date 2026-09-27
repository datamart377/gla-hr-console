// PostgreSQL connection pool (node-postgres). No ORM — plain SQL everywhere.
// Uses DATABASE_URL when present (e.g. Render managed Postgres), otherwise the
// discrete PG* settings for local development.
import pg from "pg";
import { config } from "./config.js";

const poolConfig = process.env.DATABASE_URL
  ? {
      connectionString: process.env.DATABASE_URL,
      // Render internal URLs don't need SSL; set PGSSL=require for external URLs.
      ssl: process.env.PGSSL === "require" ? { rejectUnauthorized: false } : false,
      max: 10,
      idleTimeoutMillis: 30000,
    }
  : {
      host: config.db.host,
      port: config.db.port,
      user: config.db.user,
      password: config.db.password,
      database: config.db.database,
      max: 10,
      idleTimeoutMillis: 30000,
    };

export const pool = new pg.Pool(poolConfig);

pool.on("error", (err) => {
  console.error("Unexpected PostgreSQL pool error:", err.message);
});

// Small helper: run a query and return rows.
export const query = (text, params) => pool.query(text, params);
