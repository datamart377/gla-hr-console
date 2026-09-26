# IHRSM API — Backend

Express 4 + PostgreSQL backend for the **Integrated HR and Supplier Management
System (IHRSM)**. No ORM — plain SQL migrations run through the `pg` driver.

## Stack

- **Node.js 18+** with **Express 4**
- **PostgreSQL** via the **`pg`** driver; plain SQL migrations (`db:create`, `db:migrate`, `db:seed`)
- **JWT** auth (`jsonwebtoken`) + **`bcryptjs`** password hashing
- **`helmet`** (security headers), **`cors`**, **`express-rate-limit`** (throttling), **`express-validator`** (input validation), **`morgan`** (request logging)
- **`dotenv`** for config, **`nodemon`** in dev

## Setup

```bash
cd server
npm install
cp .env.example .env          # then edit DB credentials + JWT_SECRET
```

Make sure PostgreSQL is running and the credentials in `.env` are valid, then:

```bash
npm run db:create             # CREATE DATABASE (if missing)
npm run db:migrate            # apply migrations/*.sql
npm run db:seed               # load the demo dataset + demo login accounts
npm run dev                   # start the API with nodemon (http://localhost:4000)
# or:  npm start              # start with plain node
# or:  npm run db:reset       # create + migrate + seed in one go
```

Health check: `GET http://localhost:4000/api/health`.

## Run web + API together

From the **project root** (one level up):

```bash
npm install                   # front-end deps (adds `concurrently`)
npm run server:install        # backend deps
npm run db:reset              # create + migrate + seed (needs Postgres up)
npm run dev                   # runs Vite (web:3003) + API (api:4000) together
```

## Auth & demo logins

`db:seed` creates one account per employee with an email. Password for every
seeded account is taken from `SEED_PASSWORD` in `.env` (default `password`).

| Role    | Email                          |
|---------|--------------------------------|
| admin   | r.okello@glassociates.co.ug    |
| hr      | s.nakato@glassociates.co.ug    |
| finance | g.auma@glassociates.co.ug      |

```
POST /api/auth/login   { "email": "...", "password": "..." }  ->  { token, user }
GET  /api/auth/me      (Bearer token)                          ->  { id, email, name, role, empId }
```

All `/api/*` routes below require a `Bearer <token>` header.

## REST resources

Every collection supports `GET /` (list), `GET /:id`, `POST /` (create),
`PUT|PATCH /:id` (merge-update), `DELETE /:id`. Records are returned as
`{ ...fields, id }` — the exact shape the web app consumes.

```
/api/employees        /api/leave              /api/attendance
/api/appraisals       /api/ledger-columns     /api/payroll-runs
/api/suppliers        /api/supplier-schedule  /api/supplier-runs
/api/advances         /api/stock-items        /api/stock-movements
/api/stock-closings   /api/bank-approvals
/api/settings         (GET any authed user; PUT admin only)
```

## Data model

Auth uses a relational `users` table. The domain collections each store a stable
text `id` plus a `JSONB doc` payload holding the record fields — a pragmatic
schema that keeps the API response identical to the front-end's object shapes
while remaining real, migratable SQL (no ORM). Promoting hot fields to real
columns later is a follow-up migration.

## Connecting the web app

The front-end ships with an in-memory mock (`src/api/client.js`) so the demo runs
with no server. A drop-in live client is provided at `src/api/httpClient.js` with
the same exports. To use the real API:

1. Create `.env.local` at the project root: `VITE_API_BASE=http://localhost:4000`
2. Switch the app's data layer to the HTTP client (change the import in
   `src/App.jsx` from `./api/client.js` to `./api/httpClient.js`, or re-export
   from `client.js` when `VITE_API_BASE` is set).
3. Wire the sign-in screen to `authApi.login(email, password)` so a JWT is
   obtained before the protected `/api/*` calls run.
