/* -------------------------------------------------------------------------
   Lightweight, dependency-free report constants.

   These are imported SYNCHRONOUSLY by the app (company letterhead text and the
   approved signatories), so they must not pull in heavy libraries. The actual
   PDF/Excel generators (jsPDF, exceljs) live in reportPdf.js / bankXlsx.js and
   are loaded on demand — they read COMPANY/SIGNATORIES from here.
   ------------------------------------------------------------------------- */

// Company letterhead text. Mutated in place by setReportCompany so every module
// that imported the object reference sees the current values.
export const COMPANY = {
  name: "Global Link Associates Ltd",
  lines: [
    "P.O. Box 71674, Kampala - Uganda.",
    "Tel / fax: 256-0414270704",
    "Cell: 0711506063, 0772413777",
    "Email: glassociates.ug@gmail.com",
  ],
};

// Sync the report letterhead with the editable company profile in Settings.
export function setReportCompany(c) {
  if (!c) return;
  if (c.name) COMPANY.name = c.name;
  COMPANY.lines = [
    c.address,
    c.telephone ? `Tel / fax: ${c.telephone}` : null,
    c.cell ? `Cell: ${c.cell}` : null,
    c.email ? `Email: ${c.email}` : null,
  ].filter(Boolean);
}

// Approved signatories for salary, payment and purchase documents. Editable in
// Settings; the defaults below apply until a company configures its own.
export let SIGNATORIES = [
  { name: "Ismail Kimuli", contact: "256701506063" },
  { name: "Abu-Baker Nsubuga", contact: "256772413777" },
];

// Replace the signatories from the editable Settings profile. Keeps only the
// entries that have a name; falls back to the defaults when none are set.
export function setReportSignatories(list) {
  if (!Array.isArray(list)) return;
  const clean = list
    .filter((s) => s && String(s.name || "").trim())
    .map((s) => ({ name: String(s.name || "").trim(), contact: String(s.contact || "").trim() }));
  if (clean.length) SIGNATORIES = clean;
}
