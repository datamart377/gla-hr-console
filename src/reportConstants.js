/* -------------------------------------------------------------------------
   Lightweight, dependency-free report constants.

   These are imported SYNCHRONOUSLY by the app (company letterhead text and the
   approved signatories), so they must not pull in heavy libraries. The actual
   PDF/Excel generators (jsPDF, exceljs) live in reportPdf.js / bankXlsx.js and
   are loaded on demand — they read COMPANY/SIGNATORIES from here.
   ------------------------------------------------------------------------- */

import { DEFAULT_SIGNATURE, KIMULI_SIGNATURE } from "./signatureDefault.js";

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

// Approved signatories. Each one signs on either "all" documents or only
// "payroll" payments (staff salary + supplier payment schedules, bank reports
// and payment advice). Editable in Settings; the defaults below apply until a
// company configures its own.
//   SIGNATORIES          — general documents (statements, POs, reports)
//   PAYROLL_SIGNATORIES  — payroll payments (everyone, in Settings order)
const DEFAULT_SIGNATORIES = [
  { name: "Abu-Baker Nsubuga", title: "Director, Engineering", contact: "256772413777", scope: "all", signature: DEFAULT_SIGNATURE },
  { name: "Dr. Kimuli Ismail", title: "Managing Director", contact: "256701506063", scope: "payroll", signature: KIMULI_SIGNATURE },
];
export let ALL_SIGNATORIES = DEFAULT_SIGNATORIES;
export let SIGNATORIES = DEFAULT_SIGNATORIES.filter((s) => s.scope !== "payroll");
export let PAYROLL_SIGNATORIES = DEFAULT_SIGNATORIES.slice();

// Replace the signatories from the editable Settings profile. Keeps only the
// entries that have a name; falls back to the defaults when none are set.
export function setReportSignatories(list) {
  if (!Array.isArray(list)) return;
  const clean = list
    .filter((s) => s && String(s.name || "").trim())
    .map((s) => ({ name: String(s.name || "").trim(), title: String(s.title || "").trim(), contact: String(s.contact || "").trim(), scope: s.scope === "payroll" ? "payroll" : "all", signature: isSigImage(s.signature) ? s.signature : "" }));
  if (!clean.length) return;
  ALL_SIGNATORIES = clean;
  const general = clean.filter((s) => s.scope !== "payroll");
  SIGNATORIES = general.length ? general : clean;
  PAYROLL_SIGNATORIES = clean.slice();
}

// A stored signature is an inline image data URL (PNG/JPEG).
export const isSigImage = (v) => typeof v === "string" && /^data:image\/(png|jpe?g);base64,/i.test(v);

// Same person regardless of case, punctuation, spacing or word order
// ("Abu-Baker Nsubuga" == "ABUBAKER NSUBUGA" == "Nsubuga Abu Baker").
const HONORIFICS = new Set(["dr", "mr", "mrs", "ms", "miss", "eng", "engr", "prof", "hon", "sir"]);
const nameTokens = (n) => String(n || "").toLowerCase().replace(/[^a-z\s]/g, " ").split(/\s+/).filter((t) => t && !HONORIFICS.has(t));
const nameKeys = (n) => { const t = nameTokens(n); return t.length ? [t.join(""), t.slice().sort().join("")] : []; };
export function samePerson(a, b) {
  const ka = nameKeys(a), kb = nameKeys(b);
  return ka.some((k) => kb.includes(k));
}

// The signature image for whoever signs as `name`, if they are an approved
// signatory with one on file — so it appears anywhere that person signs.
export function signatureFor(name) {
  if (!nameTokens(name).length) return null;
  const s = ALL_SIGNATORIES.find((x) => x && isSigImage(x.signature) && samePerson(x.name, name));
  return s ? s.signature : null;
}
