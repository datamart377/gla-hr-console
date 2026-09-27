// IHRSM API — Express 4 application bootstrap.
import express from "express";
import helmet from "helmet";
import cors from "cors";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { config } from "./config.js";
import { pool } from "./db.js";
import { notFound, errorHandler } from "./middleware/error.js";
import authRoutes from "./routes/auth.js";
import settingsRoutes from "./routes/settings.js";
import { crudRouter } from "./routes/crud.js";

const app = express();

// ---- Security & platform middleware ----
app.set("trust proxy", 1);
// CSP disabled so the bundled single-page app (inline styles, data: images)
// renders when served from this same service; other helmet protections stay on.
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: config.corsOrigin, credentials: true }));
app.use(express.json({ limit: "2mb" }));
app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));

// Throttle abuse: 300 requests / 15 min per IP across the API.
app.use("/api", rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests — please slow down and try again shortly." },
}));

// Stricter limiter for auth to blunt brute-force attempts.
app.use("/api/auth/login", rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many sign-in attempts — please wait a few minutes." },
}));

// ---- Health check ----
app.get("/api/health", async (req, res) => {
  try {
    await pool.query("SELECT 1");
    res.json({ status: "ok", db: "connected", time: new Date().toISOString() });
  } catch {
    res.status(503).json({ status: "degraded", db: "unavailable" });
  }
});

// ---- Routes ----
app.use("/api/auth", authRoutes);
app.use("/api/settings", settingsRoutes);

// Domain collections (table name -> REST resource path).
const COLLECTIONS = {
  employees: "employees",
  leave: "leave",
  attendance: "attendance",
  appraisals: "appraisals",
  "ledger-columns": "ledger_columns",
  "payroll-runs": "payroll_runs",
  suppliers: "suppliers",
  "supplier-schedule": "supplier_schedule",
  "supplier-runs": "supplier_runs",
  advances: "advances",
  "stock-items": "stock_items",
  "stock-movements": "stock_movements",
  "stock-closings": "stock_closings",
  "bank-approvals": "bank_approvals",
};
for (const [path, table] of Object.entries(COLLECTIONS)) {
  app.use(`/api/${path}`, crudRouter(table));
}

// ---- Serve the built front-end (single-service deploy, e.g. Render) ----
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.join(__dirname, "..", "..", "dist");
if (fs.existsSync(path.join(distDir, "index.html"))) {
  app.use(express.static(distDir));
  // SPA fallback for any non-API GET route.
  app.get(/^(?!\/api\/).*/, (req, res) => res.sendFile(path.join(distDir, "index.html")));
  console.log(`Serving web app from ${distDir}`);
}

// ---- 404 + errors ----
app.use(notFound);
app.use(errorHandler);

const server = app.listen(config.port, () => {
  console.log(`IHRSM API listening on http://localhost:${config.port}`);
  console.log(`CORS allowed origins: ${config.corsOrigin.join(", ")}`);
});

// Graceful shutdown
for (const sig of ["SIGINT", "SIGTERM"]) {
  process.on(sig, () => {
    console.log(`\n${sig} received — shutting down.`);
    server.close(() => pool.end().then(() => process.exit(0)));
  });
}

export default app;
