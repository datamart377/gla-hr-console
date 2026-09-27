# Deploying IHRSM to Render

The app deploys as **one Render Web Service** that serves both the built React
front-end and the Express `/api` routes, backed by a **managed PostgreSQL**
database. Everything is defined in `render.yaml` (a Render Blueprint).

## Option A — Blueprint (recommended, one click)

1. Push this repository to GitHub (with `render.yaml` at the root).
2. In Render: **New ➜ Blueprint**, connect the repo, and select it.
3. Render reads `render.yaml` and provisions:
   - **ihrsm-db** — a free PostgreSQL database.
   - **ihrsm** — a Node web service that builds the app, runs migrations, seeds
     demo data on first deploy, and starts the server.
4. Click **Apply**. First build takes a few minutes.
5. Open the service URL (e.g. `https://ihrsm.onrender.com`) and sign in:
   - **r.okello@glassociates.co.ug** (admin) · password **password**
   - `s.nakato@…` (hr), `g.auma@…` (finance)

That's it — the front end talks to the API on the same origin (`VITE_API_BASE=/`),
so there's no CORS or separate URL to configure.

## Option B — Manual (no blueprint)

1. **Create the database:** Render ➜ New ➜ PostgreSQL (free). Copy its
   **Internal Database URL**.
2. **Create a Web Service** from the repo:
   - Runtime: **Node**
   - Build command:
     ```
     npm install --include=dev && npm --prefix server install && npm run build && npm --prefix server run db:migrate && node server/scripts/seedIfEmpty.js
     ```
   - Start command: `node server/src/index.js`
   - Health check path: `/api/health`
3. **Environment variables:**
   | Key | Value |
   |-----|-------|
   | `DATABASE_URL` | the Internal Database URL from step 1 |
   | `VITE_API_BASE` | `/` |
   | `JWT_SECRET` | a long random string |
   | `SEED_PASSWORD` | `password` (or your choice) |
   | `NODE_ENV` | `production` |
   | `NODE_VERSION` | `20` |
4. Deploy. Open the URL and sign in with the demo accounts above.

## Notes

- **Migrations** run on every deploy (idempotent). **Seeding** runs only when the
  database is empty (`seedIfEmpty.js`), so redeploys never overwrite live data.
  To force a fresh reseed, open the service **Shell** and run
  `npm --prefix server run db:seed` (this truncates and reloads demo data).
- **External DB connections** (outside Render) need SSL — set `PGSSL=require`.
- **Free tier caveats:** the free web service sleeps when idle (first request
  after idle is slow to wake), and free PostgreSQL databases expire after ~30
  days. Upgrade the plans in `render.yaml` for production use.
- **Change the demo password** (`SEED_PASSWORD`) and rotate `JWT_SECRET` before
  any real use.
