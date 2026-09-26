/* -------------------------------------------------------------------------
   Branded PDF reports — one standardised template for every document the
   system produces. Each PDF carries the same letterhead (logo, address and
   contacts), a brand title block with an eyebrow label and reference, a
   consistent navy/zebra table theme, an optional signatory block, and a
   "Page X of Y" footer repeated on every page.

   Two entry points share the template:
     • downloadReportPdf(...)   — a single-table report (registers, schedules)
     • downloadDocumentPdf(...) — a multi-section document (the staff file)

   Built client-side with jsPDF + jspdf-autotable (no server).
   ------------------------------------------------------------------------- */
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { GLA_LOGO } from "./logo.js";

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

// Approved signatories for salary and payment schedules.
export const SIGNATORIES = [
  { name: "Ismail Kimuli", contact: "256701506063" },
  { name: "Abu-Baker Nsubuga", contact: "256772413777" },
];

/* -------------------------------- palette -------------------------------- */
const INK = [16, 24, 33];        // near-black headings
const BODY = [70, 78, 88];       // grey body text
const MUTED = [140, 148, 157];   // captions / footer
const BRAND = [16, 55, 84];      // deep navy (from the logo)
const ORANGE = [232, 108, 43];   // logo orange
const RULE = [214, 220, 226];    // hairlines
const ZEBRA = [244, 247, 249];   // alternate rows
const KVFILL = [239, 243, 246];  // key-column shading

const MARGIN = 42;
const LOGO_W = 132, LOGO_H = LOGO_W / 2.5; // native 320×128 → 2.5:1

const todayLong = () =>
  new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
const refCode = () => {
  const d = new Date();
  const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
  return `GLA/RPT/${ymd}/${String(Math.floor(Date.now() % 900) + 100)}`;
};

/* ------------------------------ letterhead ------------------------------- */
function drawLetterhead(doc) {
  const pageW = doc.internal.pageSize.getWidth();
  const top = 34;
  try { doc.addImage(GLA_LOGO, "PNG", MARGIN, top, LOGO_W, LOGO_H); } catch (e) { /* logo optional */ }

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(...BODY);
  let cy = top + 6;
  COMPANY.lines.forEach((ln) => { doc.text(ln, pageW - MARGIN, cy, { align: "right" }); cy += 11.5; });

  const ruleY = Math.max(top + LOGO_H, cy) + 9;
  doc.setDrawColor(...BRAND);
  doc.setLineWidth(2);
  doc.line(MARGIN, ruleY, pageW - MARGIN, ruleY);
  doc.setDrawColor(...ORANGE);      // short accent segment under the logo side
  doc.setLineWidth(2);
  doc.line(MARGIN, ruleY, MARGIN + 150, ruleY);
  return ruleY + 22;
}

// Ensure the letterhead is drawn exactly once per page (for multi-table docs).
function letterheadGuard() {
  const drawn = new Set([1]);
  return (doc, pageNumber) => { if (!drawn.has(pageNumber)) { drawn.add(pageNumber); drawLetterhead(doc); } };
}

/* ------------------------------ title block ------------------------------ */
function drawTitleBlock(doc, y, { eyebrow, title, subtitle, meta, reference }) {
  const pageW = doc.internal.pageSize.getWidth();
  if (eyebrow) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(...ORANGE);
    doc.text(String(eyebrow).toUpperCase(), MARGIN, y, { charSpace: 1.2 });
    y += 13;
  }
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(...INK);
  doc.text(title, MARGIN, y);

  // Reference + generated date, right-aligned against the title baseline
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(...MUTED);
  doc.text(reference, pageW - MARGIN, y - 9, { align: "right" });
  doc.text(`Generated ${todayLong()}`, pageW - MARGIN, y, { align: "right" });

  y += 6;
  if (subtitle) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);
    doc.setTextColor(...BODY);
    doc.text(subtitle, MARGIN, y + 10);
    y += 14;
  }
  if (meta && meta.length) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(...BODY);
    meta.forEach((m, i) => doc.text(m, MARGIN, y + 12 + i * 11));
    y += 12 + meta.length * 11;
  }
  return y + 10;
}

/* ------------------------------ signatories ------------------------------ */
function drawSignatories(doc, startY, signatories) {
  const pageW = doc.internal.pageSize.getWidth();
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...INK);
  doc.text("Approved Signatory", MARGIN, startY);
  const lineY = startY + 46;
  const n = signatories.length;
  const colW = (pageW - MARGIN * 2) / n;
  signatories.forEach((s, i) => {
    const cx = MARGIN + colW * i + colW / 2;
    // Digital signature (or pending note) drawn just above the ruled line.
    if (s.signedText) {
      doc.setFont("helvetica", "bolditalic");
      doc.setFontSize(15);
      doc.setTextColor(20, 90, 60);
      doc.text(String(s.signedText), cx, lineY - 6, { align: "center" });
    } else if (s.pending) {
      doc.setFont("helvetica", "italic");
      doc.setFontSize(8.5);
      doc.setTextColor(...MUTED);
      doc.text(String(s.pending), cx, lineY - 6, { align: "center" });
    }
    doc.setDrawColor(...RULE);
    doc.setLineWidth(0.6);
    doc.line(cx - colW * 0.33, lineY, cx + colW * 0.33, lineY);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10.5);
    doc.setTextColor(...INK);
    doc.text(s.name, cx, lineY + 15, { align: "center" });
    let yy = lineY + 15;
    if (s.title) {
      yy += 12;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.5);
      doc.setTextColor(...BRAND);
      doc.text(String(s.title), cx, yy, { align: "center" });
    }
    if (s.contact) {
      yy += 12;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(...BODY);
      doc.text(String(s.contact), cx, yy, { align: "center" });
    }
    if (s.signedMeta) {
      yy += 11;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(...MUTED);
      doc.text(String(s.signedMeta), cx, yy, { align: "center" });
    }
  });
  return lineY + 60;
}

/* -------------------------------- footer --------------------------------- */
function drawFooters(doc) {
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const total = doc.getNumberOfPages();
  for (let i = 1; i <= total; i++) {
    doc.setPage(i);
    doc.setDrawColor(...RULE);
    doc.setLineWidth(0.5);
    doc.line(MARGIN, pageH - 30, pageW - MARGIN, pageH - 30);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(...MUTED);
    doc.text(`${COMPANY.name} · Confidential`, MARGIN, pageH - 18);
    doc.text(`Page ${i} of ${total}`, pageW - MARGIN, pageH - 18, { align: "right" });
  }
}

/* ------------------------- shared table styling -------------------------- */
const isNumericCell = (v) => {
  const s = String(v == null ? "" : v).trim();
  if (s === "" || s === "—" || s === "n/a" || s === "-") return true; // neutral
  return /^(UGX\s*)?[-+]?[\d,]+(\.\d+)?%?$/.test(s);
};
// Right-align columns whose data is numeric (money, counts, %).
function numericColumnStyles(head, body) {
  const styles = {};
  head.forEach((_, c) => {
    let numeric = 0, real = 0;
    body.forEach((row) => {
      const v = row[c];
      const s = String(v == null ? "" : v).trim();
      if (s === "" || s === "—" || s === "n/a" || s === "-") return;
      real++; if (isNumericCell(v)) numeric++;
    });
    if (real > 0 && numeric === real) styles[c] = { halign: "right" };
  });
  return styles;
}

function runTable(doc, { head, body, startY, guard, columnStyles }) {
  autoTable(doc, {
    head: head ? [head] : undefined,
    body,
    startY,
    margin: { left: MARGIN, right: MARGIN, top: 34, bottom: 42 },
    styles: { font: "helvetica", fontSize: 8, cellPadding: 4.5, textColor: BODY, lineColor: RULE, lineWidth: 0.5, overflow: "linebreak", valign: "middle" },
    headStyles: { fillColor: BRAND, textColor: [255, 255, 255], fontStyle: "bold", fontSize: 8, cellPadding: 5 },
    alternateRowStyles: { fillColor: ZEBRA },
    columnStyles: columnStyles || {},
    didDrawPage: (data) => guard(doc, data.pageNumber),
  });
  return doc.lastAutoTable.finalY;
}

/* --------------------------- single-table report ------------------------- */
export function downloadReportPdf({ filename, eyebrow = "Report", title, subtitle, head, body, orientation = "portrait", meta = [], signatories = null }) {
  const doc = new jsPDF({ orientation, unit: "pt", format: "a4" });
  const guard = letterheadGuard();
  let y = drawLetterhead(doc);
  y = drawTitleBlock(doc, y, { eyebrow, title, subtitle, meta, reference: refCode() });
  y = runTable(doc, { head, body, startY: y, guard, columnStyles: numericColumnStyles(head, body) });

  if (signatories && signatories.length) {
    const pageH = doc.internal.pageSize.getHeight();
    let sy = y + 46;
    if (sy + 100 > pageH - 40) { doc.addPage(); guard(doc, doc.getNumberOfPages()); sy = drawLetterhead(doc) + 20; }
    drawSignatories(doc, sy, signatories);
  }
  drawFooters(doc);
  doc.save(filename);
}

/* ------------------------- multi-section document ------------------------ */
function drawSectionHeading(doc, y, text) {
  const pageW = doc.internal.pageSize.getWidth();
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10.5);
  doc.setTextColor(...BRAND);
  doc.text(text, MARGIN, y);
  doc.setDrawColor(...ORANGE);
  doc.setLineWidth(1.4);
  doc.line(MARGIN, y + 5, MARGIN + 26, y + 5);
  return y + 12;
}

/**
 * downloadDocumentPdf({ filename, eyebrow, title, subtitle, meta, sections })
 *  sections: [{ heading, type:'kv', rows:[[k,v],...] } | { heading, type:'table', head:[...], body:[[...]], empty }]
 */
export function downloadDocumentPdf({ filename, eyebrow = "Document", title, subtitle, meta = [], sections = [] }) {
  const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const guard = letterheadGuard();
  let y = drawLetterhead(doc);
  y = drawTitleBlock(doc, y, { eyebrow, title, subtitle, meta, reference: refCode() });

  sections.forEach((sec) => {
    // Keep a heading with at least a little of its content on the same page.
    if (y + 60 > pageH - 42) { doc.addPage(); guard(doc, doc.getNumberOfPages()); y = drawLetterhead(doc) + 6; }
    y = drawSectionHeading(doc, y + 6, sec.heading);
    if (sec.type === "kv") {
      const rows = (sec.rows || []).map(([k, v]) => [k, v == null || v === "" ? "N/A" : String(v)]);
      y = runTable(doc, {
        body: rows, startY: y, guard,
        columnStyles: { 0: { cellWidth: (pageW - MARGIN * 2) * 0.36, fontStyle: "bold", textColor: INK, fillColor: KVFILL } },
      });
    } else {
      const body = (sec.body && sec.body.length) ? sec.body : [[sec.empty || "None on record", ...Array((sec.head ? sec.head.length : 1) - 1).fill("")]];
      y = runTable(doc, { head: sec.head, body, startY: y, guard, columnStyles: numericColumnStyles(sec.head || [], body) });
    }
  });

  drawFooters(doc);
  doc.save(filename);
}
