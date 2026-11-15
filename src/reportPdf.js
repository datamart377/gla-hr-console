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
import qrcode from "qrcode-generator";
import { GLA_HEADER, GLA_HEADER_RATIO } from "./header.js";

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
const BRAND = [90, 58, 42];      // deep brown (from the logo)
const ORANGE = [176, 128, 112];  // logo clay accent (#B08070)
const RULE = [214, 220, 226];    // hairlines
const ZEBRA = [247, 243, 240];   // alternate rows (warm tint)
const KVFILL = [245, 239, 235];  // key-column shading (warm tint)

const MARGIN = 42;
const HEADER_MAX_H = 96;         // cap the letterhead banner height
// On continuation pages the letterhead is redrawn at the top, so a table must
// resume just below it (top banner + rule + small gap) instead of at y=34.
const CONT_TOP = 30 + HEADER_MAX_H + 24;

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
  const top = 30;
  // Master header banner (logo + company name + tagline + address), capped in height
  // and left-aligned so it stays compact on both portrait and landscape pages.
  let w = pageW - MARGIN * 2;
  let h = w / GLA_HEADER_RATIO;
  if (h > HEADER_MAX_H) { h = HEADER_MAX_H; w = h * GLA_HEADER_RATIO; }
  try { doc.addImage(GLA_HEADER, "PNG", MARGIN, top, w, h); } catch (e) { /* header optional */ }

  const ruleY = top + h + 9;
  doc.setDrawColor(...BRAND);
  doc.setLineWidth(2);
  doc.line(MARGIN, ruleY, pageW - MARGIN, ruleY);
  doc.setDrawColor(...ORANGE);      // short clay accent segment under the logo side
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
    y += 21;   // breathing space between the eyebrow and the title
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
    margin: { left: MARGIN, right: MARGIN, top: CONT_TOP, bottom: 42 },
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
  const reference = refCode();
  let y = drawLetterhead(doc);
  drawTopRightQR(doc, reportQrText({ title, subtitle, reference, generated: todayLong() }));
  y = drawTitleBlock(doc, y, { eyebrow, title, subtitle, meta, reference });
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
  const reference = refCode();
  let y = drawLetterhead(doc);
  drawTopRightQR(doc, reportQrText({ title, subtitle, reference, generated: todayLong() }));
  y = drawTitleBlock(doc, y, { eyebrow, title, subtitle, meta, reference });

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

/* ---------------------- requisition payment voucher ---------------------- */
// Whole-number to words (for the "amount in words" line on the voucher).
function numberToWords(n) {
  n = Math.floor(Math.abs(Number(n) || 0));
  if (n === 0) return "Zero";
  const ones = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
  const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];
  const scales = ["", "Thousand", "Million", "Billion", "Trillion"];
  const chunk = (x) => {
    let s = "";
    if (x >= 100) { s += ones[Math.floor(x / 100)] + " Hundred"; x %= 100; if (x) s += " "; }
    if (x >= 20) { s += tens[Math.floor(x / 10)]; x %= 10; if (x) s += "-" + ones[x]; }
    else if (x > 0) s += ones[x];
    return s;
  };
  const parts = [];
  let i = 0;
  while (n > 0) { const c = n % 1000; if (c) parts.unshift(chunk(c) + (scales[i] ? " " + scales[i] : "")); n = Math.floor(n / 1000); i++; }
  return parts.join(" ").trim();
}
const voMoney = (n) => Number(n || 0).toLocaleString("en-US");
const voDate = (s) => { if (!s) return "—"; try { return new Date(s).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }); } catch { return String(s); } };

// A row of signature boxes (no "Approved Signatory" heading), used twice on the
// voucher: the approval trail, then the paid-by / received-by line.
function drawVoucherSignRow(doc, startY, cols) {
  const pageW = doc.internal.pageSize.getWidth();
  const lineY = startY + 34;
  const colW = (pageW - MARGIN * 2) / cols.length;
  cols.forEach((s, i) => {
    const cx = MARGIN + colW * i + colW / 2;
    if (s.signedText) {
      doc.setFont("helvetica", "bolditalic"); doc.setFontSize(13); doc.setTextColor(20, 90, 60);
      doc.text(String(s.signedText), cx, lineY - 5, { align: "center" });
    }
    doc.setDrawColor(...RULE); doc.setLineWidth(0.6);
    doc.line(cx - colW * 0.34, lineY, cx + colW * 0.34, lineY);
    doc.setFont("helvetica", "bold"); doc.setFontSize(8.5); doc.setTextColor(...BRAND);
    doc.text(String(s.title || ""), cx, lineY + 13, { align: "center" });
    let yy = lineY + 13;
    if (s.name) { yy += 12; doc.setFont("helvetica", "bold"); doc.setFontSize(9.5); doc.setTextColor(...INK); doc.text(String(s.name), cx, yy, { align: "center" }); }
    if (s.meta) { yy += 11; doc.setFont("helvetica", "normal"); doc.setFontSize(7.5); doc.setTextColor(...MUTED); doc.text(String(s.meta), cx, yy, { align: "center" }); }
  });
  return lineY + 52;
}

// Draw a QR code as crisp vector squares (no raster image).
function drawQR(doc, text, x, y, size) {
  try {
    const qr = qrcode(0, "M");
    qr.addData(String(text || ""));
    qr.make();
    const n = qr.getModuleCount();
    const cell = size / n;
    doc.setFillColor(22, 22, 22);
    for (let r = 0; r < n; r++) {
      for (let c = 0; c < n; c++) {
        if (qr.isDark(r, c)) doc.rect(x + c * cell, y + r * cell, cell + 0.25, cell + 0.25, "F");
      }
    }
  } catch (e) { /* QR optional — never block the voucher */ }
}

// Verification QR, placed in the top-right corner of the voucher (in the empty
// space beside the letterhead banner). Encodes the voucher's key details.
// A verification QR in the top-right corner (beside the letterhead banner),
// used on every printable PDF: reports, the staff document, and the voucher.
function drawTopRightQR(doc, qrText) {
  const pageW = doc.internal.pageSize.getWidth();
  const size = 76, pad = 8;
  const x = pageW - MARGIN - size, y = 34;
  // White quiet-zone behind the code so scanners can read it reliably.
  doc.setFillColor(255, 255, 255);
  doc.rect(x - pad, y - pad, size + pad * 2, size + pad * 2, "F");
  drawQR(doc, qrText, x, y, size);
  doc.setFont("helvetica", "bold"); doc.setFontSize(6.4); doc.setTextColor(...BRAND);
  doc.text("SCAN TO VERIFY", x + size / 2, y + size + 11, { align: "center", charSpace: 0.5 });
}

// Verification payload for a standard report / document PDF.
function reportQrText({ title, subtitle, reference, generated }) {
  const emailLine = (COMPANY.lines || []).find((l) => /email/i.test(l)) || "";
  return [
    COMPANY.name,
    title || "Document",
    subtitle || null,
    `Ref: ${reference}`,
    `Generated: ${generated}`,
    emailLine,
  ].filter(Boolean).join("\n");
}

/**
 * downloadRequisitionVoucherPdf(req) — a formal payment voucher for a fully
 * approved field requisition. Carries the company letterhead, payee details,
 * particulars, amount in words, and the full approval trail (requested →
 * supervisor → HR & Admin) plus paid-by / received-by signature lines.
 */
export function downloadRequisitionVoucherPdf(req, opts = {}) {
  const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const guard = letterheadGuard();
  const items = Array.isArray(req.lineItems) ? req.lineItems : [];
  const total = items.reduce((a, li) => a + (Number(li.qty) || 0) * (Number(li.rate) || 0), 0);
  const payable = req.approvedAmount != null ? Number(req.approvedAmount) : total;  // HR & Admin may adjust
  const adjusted = req.approvedAmount != null && Number(req.approvedAmount) !== total;
  const cur = req.currency || "UGX";
  const voucherNo = "PV/" + String(req.id || "").replace(/^REQ-/, "");
  const loc = req.location || {};
  const emailLine = (COMPANY.lines || []).find((l) => /email/i.test(l)) || "";
  const qrText = [
    `${COMPANY.name} — PAYMENT VOUCHER`,
    `Voucher: ${voucherNo}`,
    `Requisition: ${req.id || "-"}`,
    `Payee: ${req.requesterName || "-"}`,
    `Amount: ${cur} ${voMoney(payable)}${adjusted ? ` (adjusted from ${voMoney(total)})` : ""}`,
    `Status: ${(req.status || "").toUpperCase()}`,
    req.supervisor ? `Supervisor: ${req.supervisor.name} (${voDate(req.supervisor.at)})` : null,
    req.admin ? `Approved by: ${req.admin.name} (${voDate(req.admin.at)})` : null,
    emailLine,
  ].filter(Boolean).join("\n");

  let y = drawLetterhead(doc);
  drawTopRightQR(doc, qrText);   // verification QR, top-right corner
  y = drawTitleBlock(doc, y, { eyebrow: "Payment Voucher", title: "PAYMENT VOUCHER", subtitle: null, meta: [], reference: voucherNo });

  // Compact details grid — two key/value pairs per row.
  const kcell = { fontStyle: "bold", textColor: INK, fillColor: KVFILL };
  const greenCell = { fontStyle: "bold", textColor: [20, 120, 70] };
  const station = [loc.name, loc.area].filter(Boolean).join(" · ") || "—";
  const detailRows = [
    [{ content: "Voucher No.", styles: kcell }, voucherNo, { content: "Date approved", styles: kcell }, voDate(req.admin && req.admin.at)],
    [{ content: "Requisition Ref.", styles: kcell }, req.id || "—", { content: "Payment status", styles: kcell }, { content: (req.status || "").toUpperCase() || "—", styles: greenCell }],
    [{ content: "Payee", styles: kcell }, req.requesterName || "—", { content: "Designation", styles: kcell }, req.designation || "—"],
    [{ content: "Department", styles: kcell }, req.department || "—", { content: "Station / Location", styles: kcell }, station],
    [{ content: "Purpose", styles: kcell }, { content: req.subject || "—", colSpan: 3 }],
  ];
  const keyW = 96, valW = (pageW - MARGIN * 2 - keyW * 2) / 2;
  y = runTable(doc, {
    body: detailRows, startY: y + 2, guard,
    columnStyles: { 0: { cellWidth: keyW }, 1: { cellWidth: valW }, 2: { cellWidth: keyW }, 3: { cellWidth: valW } },
  });

  // Particulars
  y = drawSectionHeading(doc, y + 16, "Particulars");
  const head = ["Item / Description", "Qty", `Rate (${cur})`, `Amount (${cur})`];
  const body = items.map((li) => [li.description || "", String(li.qty || 0), voMoney(li.rate), voMoney((Number(li.qty) || 0) * (Number(li.rate) || 0))]);
  if (adjusted) {
    body.push([{ content: "Requested total", styles: { fontStyle: "bold", textColor: MUTED } }, "", "", { content: voMoney(total), styles: { fontStyle: "bold", textColor: MUTED } }]);
    body.push([{ content: "APPROVED AMOUNT (adjusted by HR & Admin)", colSpan: 3, styles: { fontStyle: "bold", textColor: [160, 70, 40] } }, { content: voMoney(payable), styles: { fontStyle: "bold", halign: "right", textColor: [160, 70, 40] } }]);
  } else {
    body.push([{ content: "TOTAL", styles: { fontStyle: "bold", textColor: INK } }, "", "", { content: voMoney(payable), styles: { fontStyle: "bold", textColor: INK } }]);
  }
  y = runTable(doc, { head, body, startY: y + 4, guard, columnStyles: { 1: { halign: "right" }, 2: { halign: "right" }, 3: { halign: "right" } } });

  // Amount in words — highlighted band (the amount actually payable).
  const words = numberToWords(payable) + " " + (cur === "UGX" ? "Uganda Shillings" : cur) + " only";
  const wlines = doc.splitTextToSize(words, pageW - MARGIN * 2 - 104);
  const awY = y + 10, awH = Math.max(24, 9 + wlines.length * 12);
  doc.setFillColor(...KVFILL);
  doc.rect(MARGIN, awY, pageW - MARGIN * 2, awH, "F");
  doc.setFont("helvetica", "bold"); doc.setFontSize(8.5); doc.setTextColor(...INK);
  doc.text("Amount in words:", MARGIN + 8, awY + 15);
  doc.setFont("helvetica", "bolditalic"); doc.setTextColor(...BRAND);
  doc.text(wlines, MARGIN + 96, awY + 15);
  y = awY + awH;

  // Remarks / justification (from the requisition narrative), when present.
  if (req.narrative && String(req.narrative).trim()) {
    y = drawSectionHeading(doc, y + 16, "Remarks / Justification");
    doc.setFont("helvetica", "normal"); doc.setFontSize(9); doc.setTextColor(...BODY);
    const nlines = doc.splitTextToSize(String(req.narrative).trim(), pageW - MARGIN * 2);
    doc.text(nlines, MARGIN, y + 14);
    y = y + 14 + nlines.length * 12;
  }

  // Signature block — anchored toward the lower page so the voucher reads as a
  // complete, balanced document.
  const SIG_H = 198;
  let sy = y + 40;
  if (sy < pageH - 124 - SIG_H) sy = pageH - 124 - SIG_H;
  if (sy + SIG_H > pageH - 44) { doc.addPage(); guard(doc, doc.getNumberOfPages()); sy = drawLetterhead(doc) + 26; }
  doc.setFont("helvetica", "italic"); doc.setFontSize(8); doc.setTextColor(...BODY);
  doc.text("Certified that the particulars above are correct and the payment is approved for disbursement.", MARGIN, sy - 12, { maxWidth: pageW - MARGIN * 2 });
  sy = drawVoucherSignRow(doc, sy, [
    { title: "Requested by", name: req.requesterName || "—", meta: "Submitted " + voDate(req.createdAt) },
    { title: "Supervisor (1st level)", name: req.supervisor ? req.supervisor.name : "—", signedText: req.supervisor ? req.supervisor.name : null, meta: req.supervisor ? "Approved " + voDate(req.supervisor.at) : "Pending" },
    { title: "HR & Admin (final)", name: req.admin ? req.admin.name : "—", signedText: req.admin ? req.admin.name : null, meta: req.admin ? "Approved " + voDate(req.admin.at) : "Pending" },
  ]);
  drawVoucherSignRow(doc, sy + 14, [
    { title: "Paid by (Finance / Accounts)", name: "", meta: "Signature & date" },
    { title: "Received by (Payee)", name: req.requesterName || "", meta: "Signature & date" },
  ]);

  drawFooters(doc);
  doc.save(`Payment-Voucher-${voucherNo.replace(/\//g, "-")}.pdf`);
}

/* ---------------------------- purchase order ----------------------------- */
/**
 * downloadPurchaseOrderPdf(po) — a branded Purchase Order issued to a supplier
 * against their quotation. Letterhead + QR, supplier & order details, line
 * items, VAT totals, amount in words, optional supplier bank, and signatures.
 */
export function downloadPurchaseOrderPdf(po, opts = {}) {
  const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const guard = letterheadGuard();
  const items = Array.isArray(po.lineItems) ? po.lineItems : [];
  const cur = po.currency || "UGX";
  const rate = Number(po.vatRate ?? 18);
  const mode = po.vatMode || "inclusive";
  const sum = items.reduce((a, li) => a + (Number(li.qty) || 0) * (Number(li.unitPrice) || 0), 0);
  let vat = 0, subTotal = sum, grand = sum;
  if (mode === "exclusive") { vat = Math.round(sum * rate / 100); grand = sum + vat; }
  else if (mode === "inclusive") { vat = Math.round(sum * rate / (100 + rate)); subTotal = sum - vat; }
  const poNo = po.poNo || po.id || "";

  const qrText = [
    `${COMPANY.name} — PURCHASE ORDER`,
    `PO: ${poNo}`,
    `Supplier: ${po.supplierName || "-"}`,
    po.quoteNo ? `Quote: ${po.quoteNo}` : null,
    `Total: ${cur} ${voMoney(grand)}`,
    `Date: ${voDate(po.date)}`,
    (COMPANY.lines || []).find((l) => /email/i.test(l)) || "",
  ].filter(Boolean).join("\n");

  const reference = poNo;
  let y = drawLetterhead(doc);
  drawTopRightQR(doc, qrText);
  y = drawTitleBlock(doc, y, { eyebrow: "Procurement", title: "PURCHASE ORDER", subtitle: null, meta: [], reference });

  // Supplier & order details — two key/value pairs per row.
  const kcell = { fontStyle: "bold", textColor: INK, fillColor: KVFILL };
  const detailRows = [
    [{ content: "Supplier", styles: kcell }, po.supplierName || "—", { content: "PO No.", styles: kcell }, poNo],
    [{ content: "Address", styles: kcell }, po.supplierAddress || "—", { content: "Date", styles: kcell }, voDate(po.date)],
    [{ content: "Contact person", styles: kcell }, po.contactPerson || "—", { content: "Supplier quote no.", styles: kcell }, po.quoteNo || "—"],
    [{ content: "Supplier TIN", styles: kcell }, po.supplierTin || "—", { content: "Currency", styles: kcell }, cur],
  ];
  const keyW = 96, valW = (pageW - MARGIN * 2 - keyW * 2) / 2;
  y = runTable(doc, { body: detailRows, startY: y + 2, guard, columnStyles: { 0: { cellWidth: keyW }, 1: { cellWidth: valW }, 2: { cellWidth: keyW }, 3: { cellWidth: valW } } });

  doc.setFont("helvetica", "italic"); doc.setFontSize(9); doc.setTextColor(...BODY);
  doc.text("Please arrange to supply the following items as per the quotation referenced above:", MARGIN, y + 16);
  y += 22;

  // Line items.
  const head = ["Item code", "Description", "Qty", "Unit", `Unit price (${cur})`, `Amount (${cur})`];
  const body = items.map((li) => [li.code || "", li.description || "", String(li.qty || 0), li.unit || "", voMoney(li.unitPrice), voMoney((Number(li.qty) || 0) * (Number(li.unitPrice) || 0))]);
  const span = (label, value) => [{ content: label, colSpan: 5, styles: { halign: "right", fontStyle: "bold", textColor: INK } }, { content: value, styles: { halign: "right", fontStyle: "bold", textColor: INK } }];
  if (mode === "inclusive") { body.push(span("Sub-total (excl. VAT)", voMoney(subTotal))); body.push(span(`VAT (${rate}%, included)`, voMoney(vat))); body.push(span("GRAND TOTAL (incl. VAT)", voMoney(grand))); }
  else if (mode === "exclusive") { body.push(span("Sub-total", voMoney(subTotal))); body.push(span(`VAT (${rate}%)`, voMoney(vat))); body.push(span("GRAND TOTAL", voMoney(grand))); }
  else { body.push(span("GRAND TOTAL", voMoney(grand))); }
  y = runTable(doc, { head, body, startY: y, guard, columnStyles: { 2: { halign: "right" }, 4: { halign: "right" }, 5: { halign: "right" } } });

  // Amount in words.
  const words = numberToWords(grand) + " " + (cur === "UGX" ? "Uganda Shillings" : cur) + " only";
  const wlines = doc.splitTextToSize(words, pageW - MARGIN * 2 - 104);
  const awY = y + 10, awH = Math.max(24, 9 + wlines.length * 12);
  doc.setFillColor(...KVFILL); doc.rect(MARGIN, awY, pageW - MARGIN * 2, awH, "F");
  doc.setFont("helvetica", "bold"); doc.setFontSize(8.5); doc.setTextColor(...INK);
  doc.text("Amount in words:", MARGIN + 8, awY + 15);
  doc.setFont("helvetica", "bolditalic"); doc.setTextColor(...BRAND);
  doc.text(wlines, MARGIN + 96, awY + 15);
  y = awY + awH;

  // Supplier bank details (where Global Link settles the invoice), if on file.
  if (po.bankAccount || po.bankName) {
    y = drawSectionHeading(doc, y + 16, "Supplier bank details");
    doc.setFont("helvetica", "normal"); doc.setFontSize(8.6); doc.setTextColor(...BODY);
    const bank = [po.bankName ? `Bank: ${po.bankName}` : null, po.bankBranch ? `Branch: ${po.bankBranch}` : null, po.bankAccount ? `Account: ${po.bankAccount}` : null].filter(Boolean).join("    ");
    doc.text(bank, MARGIN, y + 12); y += 18;
  }
  if (po.notes && String(po.notes).trim()) {
    y = drawSectionHeading(doc, y + 14, "Notes");
    doc.setFont("helvetica", "normal"); doc.setFontSize(8.6); doc.setTextColor(...BODY);
    const nl = doc.splitTextToSize(String(po.notes).trim(), pageW - MARGIN * 2);
    doc.text(nl, MARGIN, y + 12); y += 12 + nl.length * 11;
  }

  // Signatures — anchored toward the lower page.
  const SIG_H = 96;
  let sy = y + 40;
  if (sy < pageH - 70 - SIG_H) sy = pageH - 70 - SIG_H;
  if (sy + SIG_H > pageH - 44) { doc.addPage(); guard(doc, doc.getNumberOfPages()); sy = drawLetterhead(doc) + 26; }
  // Approving authority is a configured signatory, always a different person
  // from whoever prepared the PO (fall back to the senior signatory).
  const preparer = (po.issuedBy || "").trim();
  const approver = SIGNATORIES.find((s) => s && s.name && s.name.trim() !== preparer) || SIGNATORIES[0] || {};
  drawVoucherSignRow(doc, sy, [
    { title: "Prepared by", name: po.issuedBy || "", meta: voDate(po.date) },
    { title: "Approved signatory", name: approver.name || "", meta: approver.contact || "" },
  ]);

  drawFooters(doc);
  doc.save(`Purchase-Order-${String(poNo).replace(/[/\\]/g, "-")}.pdf`);
}
