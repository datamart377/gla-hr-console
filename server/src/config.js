// Centralised configuration, loaded from environment via dotenv.
import dotenv from "dotenv";
dotenv.config();

const num = (v, d) => (v == null || v === "" ? d : Number(v));

export const config = {
  port: num(process.env.PORT, 4000),
  corsOrigin: [
    ...(process.env.CORS_ORIGIN || "http://localhost:3003").split(",").map((s) => s.trim()),
    process.env.RENDER_EXTERNAL_URL, // Render injects the public URL of the service
  ].filter(Boolean),
  jwt: {
    secret: process.env.JWT_SECRET || "dev-insecure-secret-change-me",
    expiresIn: process.env.JWT_EXPIRES_IN || "8h",
  },
  seedPassword: process.env.SEED_PASSWORD || "password",
  // Outbound email (SMTP) for system notifications. Left blank => notifications
  // are silently skipped (the app keeps working). Set these as secrets in Render.
  mail: {
    host: process.env.SMTP_HOST || "",
    port: num(process.env.SMTP_PORT, 587),
    // Secure (implicit TLS) is used for port 465; STARTTLS for 587. An explicit
    // SMTP_SECURE=true|false overrides the port-based default.
    secure: process.env.SMTP_SECURE != null && process.env.SMTP_SECURE !== ""
      ? String(process.env.SMTP_SECURE).toLowerCase() === "true"
      : num(process.env.SMTP_PORT, 587) === 465,
    user: process.env.SMTP_USER || "",
    pass: process.env.SMTP_PASS || "",
    from: process.env.MAIL_FROM || (process.env.SMTP_USER ? `Global Link Associates HR <${process.env.SMTP_USER}>` : ""),
    // Public app URL used for links inside emails (falls back to Render's URL).
    appUrl: process.env.APP_URL || process.env.RENDER_EXTERNAL_URL || "",
  },
  db: {
    host: process.env.PGHOST || "localhost",
    port: num(process.env.PGPORT, 5432),
    user: process.env.PGUSER || "postgres",
    password: process.env.PGPASSWORD || "postgres",
    database: process.env.PGDATABASE || "gla_hr",
  },
};
