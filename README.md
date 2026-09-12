# GLA HR Console — Front-end Demo Prototype

A front-end-only prototype of an HR management console for **Global Link
Associates Ltd** (engineering services, Kampala). It runs entirely in the
browser with mock in-memory data — **no backend required**.

## Stack

| Layer        | Choice                                                        |
|--------------|--------------------------------------------------------------|
| Framework    | **React 18** — functional components + hooks (`useState`, `useEffect`, `useMemo`) |
| Build/dev    | **Vite 5** — dev server on **port 3003**                      |
| Language     | Plain **JSX** / ES modules (`import` / `export`)              |
| Architecture | Single-file app in `src/App.jsx`                             |
| Styling      | Inline `style={{…}}` props + **CSS custom properties** (dark theme) in `src/index.css` |
| Icons        | **lucide-react**                                             |
| Data / API   | `src/api/client.js` — fetch-shaped async client backed by an in-memory store (`src/data.js`) |

## Run it

```bash
npm install
npm run dev      # → http://localhost:3003
```

Other scripts:

```bash
npm run build    # production build to dist/
npm run preview  # serve the production build
```

## Project layout

```
gla-hr-prototype/
├─ index.html
├─ vite.config.js          # port 3003
├─ package.json
└─ src/
   ├─ main.jsx             # React entry
   ├─ index.css            # global theme tokens (--accent, --danger-dim, …)
   ├─ data.js              # in-memory `data` object + derived helpers
   ├─ api/
   │  └─ client.js         # employeesApi / leaveApi / attendanceApi / appraisalsApi / payrollApi
   └─ App.jsx              # single-file app (all modules)
```

## Modules

- **Dashboard** — headcount by department, present-today, pending leave, monthly gross payroll, activity feed.
- **Employees** — searchable/filterable register, add/edit forms, full profile, CSV export.
- **Leave** — requests with approve/reject, statutory Uganda leave types, auto working-day counting.
- **Attendance** — daily clock-in/out at field sites with overtime capture.
- **Payroll** — live **URA monthly PAYE** + **NSSF (5% employee / 10% employer)** computation, printable payslips, CSV export.
- **Appraisals** — 1–5 competency reviews with overall rating.

## Wiring to a real backend

The demo's `src/api/client.js` mimics a network boundary. To point it at an
Express backend, replace the in-memory `makeCrud` implementation with `fetch`
calls (a commented example is at the top of the file). No changes are needed
in `App.jsx` — it only depends on the async `*Api` surface.

## Notes

- Payroll figures are computed on gross salary as a planning aid; real PAYE
  can be adjusted for allowable deductions, and Local Service Tax is not
  included.
- All data resets on page reload (in-memory only) — this is a prototype.
- The reference date is fixed at 2026-09-03 so the demo reads consistently.
