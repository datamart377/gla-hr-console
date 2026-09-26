// Centralised configuration, loaded from environment via dotenv.
import dotenv from "dotenv";
dotenv.config();

const num = (v, d) => (v == null || v === "" ? d : Number(v));

export const config = {
  port: num(process.env.PORT, 4000),
  corsOrigin: (process.env.CORS_ORIGIN || "http://localhost:3003")
    .split(",").map((s) => s.trim()).filter(Boolean),
  jwt: {
    secret: process.env.JWT_SECRET || "dev-insecure-secret-change-me",
    expiresIn: process.env.JWT_EXPIRES_IN || "8h",
  },
  seedPassword: process.env.SEED_PASSWORD || "password",
  db: {
    host: process.env.PGHOST || "localhost",
    port: num(process.env.PGPORT, 5432),
    user: process.env.PGUSER || "postgres",
    password: process.env.PGPASSWORD || "postgres",
    database: process.env.PGDATABASE || "gla_hr",
  },
};
