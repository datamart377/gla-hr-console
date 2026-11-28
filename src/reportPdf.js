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
// Letterhead text + signatories live in a tiny dependency-free module so the
// app can import them without loading jsPDF. Re-exported here for compatibility.
import { COMPANY, setReportCompany, SIGNATORIES, setReportSignatories, signatureFor, isSigImage, samePerson } from "./reportConstants.js";
import { quoteTotals, quoteRef } from "./data.js";
export { COMPANY, setReportCompany, SIGNATORIES, setReportSignatories };

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
// The signer's signature/stamp image, when they have one on file. Explicit
// s.signature wins; otherwise it is looked up by name (never for a pending slot).
function sigImageOf(s) {
  if (!s || s.pending || s.noSig) return null;
  if (isSigImage(s.signature)) return s.signature;
  return signatureFor(s.name) || signatureFor(s.signedText);
}
// Draw a signature image centred on cx, its bottom resting just over the rule.
function drawSigImage(doc, img, cx, baseY, maxW, maxH) {
  try {
    const p = doc.getImageProperties(img);
    const ratio = p.width / p.height || 1.8;
    let h = maxH, w = h * ratio;
    if (w > maxW) { w = maxW; h = w / ratio; }
    doc.addImage(img, /jpe?g/i.test(p.fileType || "") ? "JPEG" : "PNG", cx - w / 2, baseY - h, w, h);
    return true;
  } catch (e) { return false; } // a bad image never blocks the document
}

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
    // Signature image (when on file), else the digital signature / pending note.
    const img = sigImageOf(s);
    if (img && drawSigImage(doc, img, cx, lineY + 2, colW * 0.62, 56)) {
      /* signed with the image */
    } else if (s.signedText) {
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
    const img = sigImageOf(s);
    if (img && drawSigImage(doc, img, cx, lineY + 1, colW * 0.7, 44)) {
      /* signed with the image */
    } else if (s.signedText) {
      doc.setFont("helvetica", "bolditalic"); doc.setFontSize(13); doc.setTextColor(20, 90, 60);
      doc.text(String(s.signedText), cx, lineY - 5, { align: "center" });
    }
    doc.setDrawColor(...RULE); doc.setLineWidth(0.6);
    const half = Math.min(colW * 0.34, 130);
    doc.line(cx - half, lineY, cx + half, lineY);
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
  // Finance Officers' requests have a single approval level (HR & Admin), so
  // their voucher has no supervisor box.
  const financeDirect = req.route === "finance_direct";
  sy = drawVoucherSignRow(doc, sy, [
    { title: "Requested by", name: req.requesterName || "—", meta: "Submitted " + voDate(req.createdAt) },
    ...(financeDirect ? [] : [{ title: "Supervisor (1st level)", name: req.supervisor ? req.supervisor.name : "—", signedText: req.supervisor ? req.supervisor.name : null, meta: req.supervisor ? "Approved " + voDate(req.supervisor.at) : "Pending" }]),
    { title: financeDirect ? "HR & Admin (sole approval)" : "HR & Admin (final)", name: req.admin ? req.admin.name : "—", signedText: req.admin ? req.admin.name : null, meta: req.admin ? "Approved " + voDate(req.admin.at) : "Pending" },
  ]);
  drawVoucherSignRow(doc, sy + 14, [
    { title: "Paid by (Finance / Accounts)", name: "", meta: "Signature & date" },
    { title: "Received by (Payee)", name: req.requesterName || "", meta: "Signature & date" },
  ]);

  drawFooters(doc);
  doc.save(`Payment-Voucher-${voucherNo.replace(/\//g, "-")}.pdf`);
}

/* ------------------------------- quotation -------------------------------- */
/**
 * downloadQuotationPdf(q) — a client quotation in the Global Link template:
 * letterhead, a details block (Quote to / Scope of works / Location / Attn / Our
 * Ref / Date / Quote validity / Currency), the priced items with 18% VAT per
 * line, TOTALS, amount in words and the approved signatory (with signature &
 * stamp). A draft is watermarked and unsigned.
 */
export function downloadQuotationPdf(q) {
  const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const guard = letterheadGuard();
  const cur = q.currency || "UGX";
  const rate = Number(q.vatRate) || 0;
  const CURRENCY_WORDS = { UGX: "Uganda Shillings", USD: "US Dollars", EUR: "Euros", GBP: "Pounds Sterling", AED: "UAE Dirhams", KES: "Kenya Shillings" };
  const T = quoteTotals(q);
  const lines = T.lines;
  const sub = T.sub, grand = T.grand;
  const rev = Number(q.revision) || 0;
  const ref = quoteRef(q);
  // Not approved yet (draft or awaiting HR & Admin approval) => still a draft.
  const draft = q.status === "draft" || q.status === "pending_approval";
  const validUntil = (() => { const d = new Date((q.date || "") + "T00:00:00"); if (isNaN(d)) return ""; d.setDate(d.getDate() + (Number(q.validityDays) || 30)); return d.toISOString().slice(0, 10); })();
  const longDate = (s) => { try { return new Date(s + "T00:00:00").toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" }); } catch { return voDate(s); } };

  const qrText = [`${COMPANY.name} — QUOTATION`, `Ref: ${ref}`, `To: ${q.client || "-"}`, `Total: ${cur} ${voMoney(grand)}`, `Date: ${voDate(q.date)}`, `Valid until: ${voDate(validUntil)}`].join("\n");
  let y = drawLetterhead(doc);
  drawTopRightQR(doc, qrText);
  const title = `QUOTATION${rev ? ` — REVISION ${rev}` : ""}${draft ? (rev ? " (DRAFT)" : " — DRAFT") : ""}`;
  y = drawTitleBlock(doc, y, { eyebrow: rev ? `Quotation · Revision ${rev}` : "Quotation", title, subtitle: null, meta: [], reference: ref });

  // Details block — label column right-aligned and shaded, values in italics.
  const kcell = { fontStyle: "bold", textColor: INK, fillColor: KVFILL, halign: "right" };
  const vcell = (v, bold) => ({ content: v || "—", styles: { fontStyle: bold ? "bolditalic" : "italic" } });
  const details = [
    [{ content: "Quote to:", styles: kcell }, vcell(q.client, true)],
    [{ content: "Scope of works", styles: kcell }, vcell(q.scope)],
    [{ content: "Location:", styles: kcell }, vcell(q.sites)],
    [{ content: "Attn:", styles: kcell }, vcell(q.attn)],
    [{ content: "Our Ref", styles: kcell }, vcell(rev ? `${q.quoteNo} — Revision ${rev}` : ref, true)],
    ...(rev ? [[{ content: "Revision", styles: kcell }, vcell(`Rev. ${rev}${q.revisionReason ? ` — ${q.revisionReason}` : ""}. Supersedes all earlier versions of ${q.quoteNo}.`)]] : []),
    [{ content: "Date", styles: kcell }, vcell(longDate(q.date))],
    [{ content: "Quote validity", styles: kcell }, vcell(`${Number(q.validityDays) || 30} calendar days (valid until ${voDate(validUntil)})`, true)],
    [{ content: "Currency", styles: kcell }, vcell(CURRENCY_WORDS[cur] || cur)],
  ];
  y = runTable(doc, { body: details, startY: y + 2, guard, columnStyles: { 0: { cellWidth: 130 } } });

  // Items.
  const head = ["No", "Description & Specification", "Item", "Qty", "Rate", "Sub total", `${rate}% VAT`, "Sub total"];
  const body = lines.map((l, i) => [String(i + 1), l.description || "", l.unit || "", voMoney(l.qty), voMoney(l.rate), voMoney(l.sub), voMoney(l.vat), voMoney(l.total)]);
  const tot = (label, a, b, c, color) => {
    const st = { fontStyle: "bolditalic", halign: "right", textColor: color || INK };
    return ["", { content: label, colSpan: 4, styles: st }, { content: a, styles: st }, { content: b, styles: st }, { content: c, styles: st }];
  };
  body.push(tot("TOTALS", voMoney(sub), voMoney(T.lineVat), voMoney(T.lineTotal)));
  if (T.discount) {
    body.push(tot(T.discountLabel, `-${voMoney(T.discount)}`, `-${voMoney(T.lineVat - T.vat)}`, `-${voMoney(T.lineTotal - grand)}`, [176, 40, 30]));
    body.push(tot("TOTALS AFTER DISCOUNT", voMoney(T.netSub), voMoney(T.vat), voMoney(grand)));
  }
  y = runTable(doc, { head, body, startY: y + 12, guard, columnStyles: { 0: { cellWidth: 24 }, 1: { cellWidth: 170 }, 2: { cellWidth: 36 }, 3: { halign: "right", cellWidth: 36 }, 4: { halign: "right" }, 5: { halign: "right" }, 6: { halign: "right" }, 7: { halign: "right" } } });

  // Amount in words (as in the template: red words, currency in brand colour).
  const words = numberToWords(grand);
  const wl = doc.splitTextToSize(words, pageW - MARGIN * 2 - 140);
  const awY = y + 12, awH = Math.max(26, 12 + wl.length * 12);
  doc.setFillColor(...KVFILL); doc.rect(MARGIN, awY, pageW - MARGIN * 2, awH, "F");
  doc.setFont("helvetica", "bolditalic"); doc.setFontSize(9.5); doc.setTextColor(200, 40, 30);
  doc.text(wl, MARGIN + 10, awY + 16);
  doc.setTextColor(...BRAND); doc.text(CURRENCY_WORDS[cur] || cur, pageW - MARGIN - 10, awY + 16, { align: "right" });
  y = awY + awH;

  if (q.notes && String(q.notes).trim()) {
    y = drawSectionHeading(doc, y + 16, "Notes / terms");
    doc.setFont("helvetica", "normal"); doc.setFontSize(8.6); doc.setTextColor(...BODY);
    const nl = doc.splitTextToSize(String(q.notes).trim(), pageW - MARGIN * 2);
    if (y + 12 + nl.length * 11 > pageH - 60) { doc.addPage(); guard(doc, doc.getNumberOfPages()); y = drawLetterhead(doc) + 10; }
    doc.text(nl, MARGIN, y + 12); y += 12 + nl.length * 11;
  }

  // Approved signatory — name, title, contact, with signature & stamp once sent.
  const sig = SIGNATORIES[0] || {};
  let sy = y + 30;
  if (sy + 110 > pageH - 44) { doc.addPage(); guard(doc, doc.getNumberOfPages()); sy = drawLetterhead(doc) + 26; }
  doc.setFont("helvetica", "bolditalic"); doc.setFontSize(10); doc.setTextColor(...INK);
  doc.text("Approved Signatory", MARGIN, sy);
  const img = draft ? null : sigImageOf(sig);
  if (img) drawSigImage(doc, img, MARGIN + 230, sy + 62, 150, 66);
  doc.setFont("helvetica", "bold"); doc.setFontSize(10); doc.setTextColor(...INK);
  doc.text(String(sig.name || ""), MARGIN, sy + 22);
  let ly = sy + 22;
  if (sig.title) { ly += 13; doc.setFont("helvetica", "bold"); doc.setFontSize(8.8); doc.setTextColor(...BRAND); doc.text(String(sig.title), MARGIN, ly); }
  if (sig.contact) { ly += 13; doc.setFont("helvetica", "normal"); doc.setFontSize(9); doc.setTextColor(...BODY); doc.text(String(sig.contact), MARGIN, ly); }
  if (draft) { ly += 14; doc.setFont("helvetica", "italic"); doc.setFontSize(8); doc.setTextColor(...MUTED); doc.text(q.status === "pending_approval" ? "Draft — awaiting HR & Admin approval" : "Draft — not yet issued", MARGIN, ly); }

  drawFooters(doc);
  if (draft) {
    for (let pg = 1; pg <= doc.getNumberOfPages(); pg++) {
      doc.setPage(pg);
      try { doc.saveGraphicsState(); doc.setGState(new doc.GState({ opacity: 0.1 })); } catch (e) { /* older jsPDF */ }
      doc.setFont("helvetica", "bold"); doc.setFontSize(110); doc.setTextColor(200, 60, 50);
      doc.text("DRAFT", pageW / 2, pageH / 2 + 40, { align: "center", angle: 35 });
      try { doc.restoreGraphicsState(); } catch (e) { /* noop */ }
    }
  }
  doc.save(`Quotation-${String(ref).replace(/ Rev\. /, "-Rev").replace(/[/\\]/g, "-").replace(/\s+/g, "")}${draft ? "-DRAFT" : ""}.pdf`);
}

/* -------------------------- certificate of service ------------------------- */
/**
 * downloadServiceCertificatePdf(emp) — the certificate of service an employer
 * issues when employment ends (Employment Act, 2006): who the employer and
 * employee are, the work done, and the dates of service. Deliberately says
 * nothing about the reason for leaving, conduct or performance.
 */
export function downloadServiceCertificatePdf(e) {
  const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const guard = letterheadGuard();
  const name = `${e.firstName || ""} ${e.lastName || ""}`.trim() || e.id;
  const longDate = (s) => { if (!s) return "—"; const d = new Date(String(s).slice(0, 10) + "T00:00:00"); return isNaN(d) ? String(s) : d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }); };
  const months = (() => {
    if (!e.employmentDate || !e.exitDate) return 0;
    const a = new Date(e.employmentDate + "T00:00:00"), b = new Date(e.exitDate + "T00:00:00");
    let m = (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth()); if (b.getDate() < a.getDate()) m -= 1; return Math.max(0, m);
  })();
  const service = (() => { const y = Math.floor(months / 12), r = months % 12; if (!y && !r) return "less than one month"; return [y && `${y} year${y === 1 ? "" : "s"}`, r && `${r} month${r === 1 ? "" : "s"}`].filter(Boolean).join(" and "); })();
  const ref = `GLA/HR/COS/${e.id}`;
  const company = COMPANY.name || "Global Link Associates Ltd";

  let y = drawLetterhead(doc);
  drawTopRightQR(doc, reportQrText({ title: "Certificate of Service", subtitle: `${name} · ${e.id}`, reference: ref, generated: todayLong() }));
  y = drawTitleBlock(doc, y, { eyebrow: "Human Resources", title: "CERTIFICATE OF SERVICE", subtitle: `${name} · ${e.id}`, meta: [], reference: ref });

  doc.setFont("helvetica", "bold"); doc.setFontSize(10.5); doc.setTextColor(...INK);
  doc.text("TO WHOM IT MAY CONCERN", MARGIN, y + 14);
  y += 32;
  const para = `This is to certify that ${name} was employed by ${company} as ${e.jobTitle || e.position || "a member of staff"}${e.department ? " in the " + e.department : ""} from ${longDate(e.employmentDate)} to ${longDate(e.exitDate)}, a period of ${service}.`;
  doc.setFont("helvetica", "normal"); doc.setFontSize(10.5); doc.setTextColor(...BODY);
  const pl = doc.splitTextToSize(para, pageW - MARGIN * 2);
  doc.text(pl, MARGIN, y, { lineHeightFactor: 1.5 });
  y += pl.length * 15.75 + 10;

  y = runTable(doc, {
    startY: y, guard,
    body: [
      ["Employer", `${company}, P.O. Box 71674, Kampala, Uganda`],
      ["Employee", name],
      ["Staff ID", e.id],
      ...(e.nationalId ? [["National ID (NIN)", e.nationalId]] : []),
      ...(e.nssfNumber && !/^n\/?a$/i.test(e.nssfNumber) ? [["NSSF number", e.nssfNumber]] : []),
      ["Position held", e.jobTitle || e.position || "—"],
      ["Department", e.department || "—"],
      ["Nature of employment", e.contractType || "—"],
      ["Date of engagement", longDate(e.employmentDate)],
      ["Date of termination", longDate(e.exitDate)],
      ["Length of service", service.charAt(0).toUpperCase() + service.slice(1)],
    ],
    columnStyles: { 0: { cellWidth: (pageW - MARGIN * 2) * 0.36, fontStyle: "bold", textColor: INK, fillColor: KVFILL } },
  });

  doc.setFont("helvetica", "normal"); doc.setFontSize(10.5); doc.setTextColor(...BODY);
  const close = doc.splitTextToSize("This certificate is issued in accordance with the Employment Act, 2006. We wish them every success in their future endeavours.", pageW - MARGIN * 2);
  doc.text(close, MARGIN, y + 22, { lineHeightFactor: 1.5 });
  y += 22 + close.length * 15.75;

  const sig = SIGNATORIES[0] || {};
  let sy = y + 26;
  if (sy + 110 > pageH - 44) { doc.addPage(); guard(doc, doc.getNumberOfPages()); sy = drawLetterhead(doc) + 26; }
  doc.setFont("helvetica", "bolditalic"); doc.setFontSize(10); doc.setTextColor(...INK);
  doc.text(`For and on behalf of ${company}`, MARGIN, sy);
  const img = sigImageOf(sig);
  if (img) drawSigImage(doc, img, MARGIN + 330, sy + 70, 150, 66);
  doc.setFont("helvetica", "bold"); doc.setFontSize(10); doc.setTextColor(...INK);
  doc.text(String(sig.name || ""), MARGIN, sy + 22);
  let ly = sy + 22;
  if (sig.title) { ly += 13; doc.setFont("helvetica", "bold"); doc.setFontSize(8.8); doc.setTextColor(...BRAND); doc.text(String(sig.title), MARGIN, ly); }
  ly += 13; doc.setFont("helvetica", "normal"); doc.setFontSize(9); doc.setTextColor(...BODY); doc.text(`Date: ${longDate(new Date().toISOString().slice(0, 10))}`, MARGIN, ly);

  drawFooters(doc);
  doc.save(`Certificate-of-Service-${e.id}.pdf`);
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
  // Only an HR & Admin-approved ("issued") PO is final; anything else prints as
  // a clearly-marked draft without the approving signature.
  const approved = !po.status || po.status === "issued";
  let y = drawLetterhead(doc);
  drawTopRightQR(doc, qrText);
  const approvedLine = approved && po.approval && po.approval.name ? [`Approved by ${po.approval.name} (HR & Admin) · ${voDate(po.approval.at)}`] : [];
  y = drawTitleBlock(doc, y, { eyebrow: "Procurement", title: approved ? "PURCHASE ORDER" : "PURCHASE ORDER — DRAFT", subtitle: null, meta: approvedLine, reference });
  if (!approved) {
    const msg = po.status === "rejected"
      ? `REJECTED by HR & Admin${po.rejection && po.rejection.reason ? " — " + po.rejection.reason : ""}. Not valid for supply.`
      : "DRAFT — awaiting HR & Admin approval. Not valid for supply until approved and issued.";
    doc.setFillColor(253, 236, 234); doc.setDrawColor(200, 60, 50); doc.setLineWidth(0.8);
    doc.rect(MARGIN, y + 2, pageW - MARGIN * 2, 22, "FD");
    doc.setFont("helvetica", "bold"); doc.setFontSize(9); doc.setTextColor(170, 40, 30);
    doc.text(doc.splitTextToSize(msg, pageW - MARGIN * 2 - 16)[0], MARGIN + 8, y + 16);
    y += 28;
  }

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
  const CURRENCY_WORDS = { UGX: "Uganda Shillings", USD: "US Dollars", EUR: "Euros", GBP: "Pounds Sterling", AED: "UAE Dirhams", KES: "Kenya Shillings" };
  const words = numberToWords(grand) + " " + (CURRENCY_WORDS[cur] || cur) + " only";
  const wlines = doc.splitTextToSize(words, pageW - MARGIN * 2 - 104);
  const awY = y + 10, awH = Math.max(24, 9 + wlines.length * 12);
  doc.setFillColor(...KVFILL); doc.rect(MARGIN, awY, pageW - MARGIN * 2, awH, "F");
  doc.setFont("helvetica", "bold"); doc.setFontSize(8.5); doc.setTextColor(...INK);
  doc.text("Amount in words:", MARGIN + 8, awY + 15);
  doc.setFont("helvetica", "bolditalic"); doc.setTextColor(...BRAND);
  doc.text(wlines, MARGIN + 96, awY + 15);
  y = awY + awH;

  // Supplier bank details (where Global Link settles the invoice), if on file.
  // International suppliers (non-UGX, or where IBAN/SWIFT is captured) get the
  // full remittance block; local suppliers get the compact bank line.
  const isIntl = (po.currency && po.currency !== "UGX") || po.iban || po.swiftCode || po.bankAddress;
  const bankLines = isIntl
    ? [
        `Account name: ${po.accountName || po.supplierName || "—"}`,
        po.bankName ? `Bank: ${po.bankName}` : null,
        po.bankAddress ? `Bank address: ${po.bankAddress}` : null,
        po.iban ? `IBAN: ${po.iban}` : null,
        po.bankAccount ? `Account no: ${po.bankAccount}` : null,
        po.swiftCode ? `SWIFT / BIC: ${po.swiftCode}` : null,
      ].filter(Boolean)
    : [[po.bankName ? `Bank: ${po.bankName}` : null, po.bankBranch ? `Branch: ${po.bankBranch}` : null, po.bankAccount ? `Account: ${po.bankAccount}` : null].filter(Boolean).join("    ")].filter(Boolean);
  if (isIntl ? bankLines.length > 1 || po.bankName || po.bankAccount : (po.bankAccount || po.bankName)) {
    y = drawSectionHeading(doc, y + 16, isIntl ? `Supplier bank details (${cur})` : "Supplier bank details");
    doc.setFont("helvetica", "normal"); doc.setFontSize(8.6); doc.setTextColor(...BODY);
    if (isIntl) { bankLines.forEach((ln, i) => doc.text(ln, MARGIN, y + 12 + i * 12)); y += 10 + bankLines.length * 12; }
    else { doc.text(bankLines[0], MARGIN, y + 12); y += 18; }
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
  // When the preparer IS the approving signatory, show one combined block.
  const preparer = (po.issuedBy || "").trim();
  const approver = SIGNATORIES.find((s) => s && s.name && !samePerson(s.name, preparer)) || SIGNATORIES[0] || {};
  const selfApproved = !!(preparer && approver.name && samePerson(preparer, approver.name));
  if (!approved) {
    drawVoucherSignRow(doc, sy, [
      { title: "Prepared by", name: po.issuedBy || "", meta: voDate(po.date) },
      { title: "Approved signatory", name: approver.name || "", noSig: true, meta: po.status === "rejected" ? "Rejected by HR & Admin" : "Pending HR & Admin approval" },
    ]);
  } else drawVoucherSignRow(doc, sy, selfApproved ? [
    { title: "Prepared & approved by", name: approver.name, signature: approver.signature || null, meta: [approver.title, approver.contact, voDate(po.date)].filter(Boolean).join(" · ") },
  ] : [
    { title: "Prepared by", name: po.issuedBy || "", meta: voDate(po.date) },
    { title: "Approved signatory", name: approver.name || "", signature: approver.signature || null, meta: [approver.title, approver.contact].filter(Boolean).join(" · ") },
  ]);

  drawFooters(doc);
  if (!approved) {
    // Diagonal "DRAFT" watermark on every page.
    for (let pg = 1; pg <= doc.getNumberOfPages(); pg++) {
      doc.setPage(pg);
      try { doc.saveGraphicsState(); doc.setGState(new doc.GState({ opacity: 0.1 })); } catch (e) { /* older jsPDF: draw without opacity */ }
      doc.setFont("helvetica", "bold"); doc.setFontSize(110); doc.setTextColor(200, 60, 50);
      doc.text(po.status === "rejected" ? "REJECTED" : "DRAFT", pageW / 2, pageH / 2 + 40, { align: "center", angle: 35 });
      try { doc.restoreGraphicsState(); } catch (e) { /* noop */ }
    }
  }
  doc.save(`Purchase-Order-${String(poNo).replace(/[/\\]/g, "-")}${approved ? "" : "-DRAFT"}.pdf`);
}

/* ------------------------------- tenancy -------------------------------- */
// Personal landlord documents (rent receipts, tenant statements, rent roll).
// Deliberately NOT on the Global Link letterhead — these belong to the
// landlord personally; the header carries the landlord's own details.
function landlordHeader(doc, profile, title, subtitle) {
  const pageW = doc.internal.pageSize.getWidth();
  const p = profile || {};
  let y = 46;
  doc.setFont("helvetica", "bold"); doc.setFontSize(17); doc.setTextColor(...INK);
  doc.text(String(p.landlordName || "Landlord"), MARGIN, y);
  doc.setFont("helvetica", "normal"); doc.setFontSize(9); doc.setTextColor(...BODY);
  const lines = [p.address, [p.phone, p.email].filter(Boolean).join("  ·  ")].filter(Boolean);
  lines.forEach((l, i) => doc.text(String(l), MARGIN, y + 15 + i * 12));
  doc.setFont("helvetica", "bold"); doc.setFontSize(15); doc.setTextColor(...BRAND);
  doc.text(String(title).toUpperCase(), pageW - MARGIN, y, { align: "right" });
  if (subtitle) { doc.setFont("helvetica", "normal"); doc.setFontSize(9); doc.setTextColor(...BODY); doc.text(String(subtitle), pageW - MARGIN, y + 15, { align: "right" }); }
  y += 15 + Math.max(lines.length, 1) * 12 + 6;
  doc.setDrawColor(...BRAND); doc.setLineWidth(1.6); doc.line(MARGIN, y, pageW - MARGIN, y);
  return y + 20;
}
function landlordFooter(doc, profile) {
  const pageW = doc.internal.pageSize.getWidth(), pageH = doc.internal.pageSize.getHeight();
  const n = doc.getNumberOfPages();
  for (let i = 1; i <= n; i++) {
    doc.setPage(i);
    doc.setDrawColor(...RULE); doc.setLineWidth(0.5); doc.line(MARGIN, pageH - 34, pageW - MARGIN, pageH - 34);
    doc.setFont("helvetica", "normal"); doc.setFontSize(7.5); doc.setTextColor(...MUTED);
    doc.text(`${(profile && profile.landlordName) || "Landlord"} · generated ${todayLong()}`, MARGIN, pageH - 22);
    doc.text(`Page ${i} of ${n}`, pageW - MARGIN, pageH - 22, { align: "right" });
  }
}
const tMoney = (n) => "UGX " + Math.round(Number(n) || 0).toLocaleString("en-US");
const tDate = (s) => { if (!s) return "—"; const d = new Date(String(s).slice(0, 10) + "T00:00:00"); return isNaN(d) ? String(s) : d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }); };
function kvBlock(doc, y, rows) {
  const pageW = doc.internal.pageSize.getWidth();
  return runTable(doc, {
    startY: y, guard: () => {}, body: rows.map(([k, v]) => [k, v == null || v === "" ? "—" : String(v)]),
    columnStyles: { 0: { cellWidth: (pageW - MARGIN * 2) * 0.32, fontStyle: "bold", textColor: INK, fillColor: KVFILL } },
  });
}

/** Rent receipt for one payment. */
export function downloadRentReceiptPdf({ profile, payment, tenantName, unitLabel, balanceAfter }) {
  const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "a5" });
  const pageW = doc.internal.pageSize.getWidth();
  let y = landlordHeader(doc, profile, "Receipt", payment.receiptNo || payment.id);
  y = kvBlock(doc, y, [
    ["Received from", tenantName],
    ["Premises", unitLabel],
    ["Date", tDate(payment.date)],
    ["For", payment.kind === "deposit" ? "Security deposit" : "Rent / charges"],
    ["Method", `${payment.method || "Cash"}${payment.reference ? ` · Ref ${payment.reference}` : ""}`],
    ...(payment.note ? [["Note", payment.note]] : []),
  ]);
  y += 16;
  doc.setFillColor(...KVFILL); doc.roundedRect(MARGIN, y, pageW - MARGIN * 2, 46, 4, 4, "F");
  doc.setFont("helvetica", "normal"); doc.setFontSize(9); doc.setTextColor(...BODY);
  doc.text("Amount received", MARGIN + 12, y + 18);
  doc.setFont("helvetica", "bold"); doc.setFontSize(16); doc.setTextColor(...INK);
  doc.text(tMoney(payment.amount), pageW - MARGIN - 12, y + 30, { align: "right" });
  doc.setFont("helvetica", "italic"); doc.setFontSize(8); doc.setTextColor(...BRAND);
  const words = doc.splitTextToSize(`${numberToWords(payment.amount)} Uganda Shillings only`, (pageW - MARGIN * 2) * 0.55);
  doc.text(words, MARGIN + 12, y + 31);
  y += 62;
  if (payment.kind !== "deposit" && balanceAfter != null) {
    doc.setFont("helvetica", "normal"); doc.setFontSize(9); doc.setTextColor(...BODY);
    doc.text(balanceAfter > 0 ? `Balance still due after this payment: ${tMoney(balanceAfter)}` : balanceAfter < 0 ? `Paid in advance (credit): ${tMoney(-balanceAfter)}` : "Account fully paid up to date.", MARGIN, y);
    y += 16;
  }
  y += 34;
  doc.setDrawColor(...RULE); doc.line(MARGIN, y, MARGIN + 160, y);
  doc.setFont("helvetica", "normal"); doc.setFontSize(8.5); doc.setTextColor(...BODY);
  doc.text(`Received by: ${(profile && profile.landlordName) || "Landlord"}`, MARGIN, y + 12);
  landlordFooter(doc, profile);
  doc.save(`Receipt-${payment.receiptNo || payment.id}.pdf`);
}

/** Tenant statement: charges and payments with running balance. */
export function downloadTenantStatementPdf({ profile, tenantName, tenantPhone, unitLabel, lease, rows, summary }) {
  const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
  let y = landlordHeader(doc, profile, "Statement", `As at ${tDate(new Date().toISOString())}`);
  y = kvBlock(doc, y, [
    ["Tenant", `${tenantName}${tenantPhone ? ` · ${tenantPhone}` : ""}`],
    ["Premises", unitLabel],
    ["Lease", `${tDate(lease.startDate)} to ${lease.endDate ? tDate(lease.endDate) : "open-ended"}${lease.status === "ended" ? " (ended)" : ""}`],
    ["Rent", `${tMoney(lease.rent)} per month, billed ${lease.cycleMonths === 1 ? "monthly" : `every ${lease.cycleMonths} months`}`],
    ["Security deposit held", tMoney(summary.depositHeld)],
  ]);
  y += 12;
  y = runTable(doc, {
    startY: y, guard: () => {},
    head: ["Date", "Details", "Ref", "Charged", "Paid", "Balance"],
    body: rows.length ? rows.map((r) => [tDate(r.date), r.description, r.ref || "", r.debit ? tMoney(r.debit) : "", r.credit ? tMoney(r.credit) : "", tMoney(r.balance)]) : [["", "No transactions yet", "", "", "", ""]],
    columnStyles: { 3: { halign: "right" }, 4: { halign: "right" }, 5: { halign: "right", fontStyle: "bold" } },
  });
  y += 14;
  doc.setFont("helvetica", "bold"); doc.setFontSize(11);
  doc.setTextColor(...(summary.balance > 0 ? [180, 50, 40] : [20, 120, 70]));
  doc.text(summary.balance > 0 ? `Amount due: ${tMoney(summary.balance)}` : summary.balance < 0 ? `In credit: ${tMoney(-summary.balance)}` : "Fully paid — nothing due", MARGIN, y);
  if (profile && profile.paymentInstructions) {
    doc.setFont("helvetica", "normal"); doc.setFontSize(9); doc.setTextColor(...BODY);
    doc.text(doc.splitTextToSize(`How to pay: ${profile.paymentInstructions}`, doc.internal.pageSize.getWidth() - MARGIN * 2), MARGIN, y + 18);
  }
  landlordFooter(doc, profile);
  doc.save(`Statement-${String(tenantName).replace(/\s+/g, "-")}.pdf`);
}

/** Rent roll: every unit with tenant, rent, balance and status. */
export function downloadRentRollPdf({ profile, rows, totals }) {
  const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
  let y = landlordHeader(doc, profile, "Rent roll", `As at ${tDate(new Date().toISOString())}`);
  y = runTable(doc, {
    startY: y, guard: () => {},
    head: ["Property", "Unit", "Type", "Tenant", "Lease ends", "Monthly rent", "Balance due", "Overdue", "Deposit held"],
    body: rows,
    columnStyles: { 5: { halign: "right" }, 6: { halign: "right", fontStyle: "bold" }, 8: { halign: "right" } },
  });
  y += 14;
  doc.setFont("helvetica", "bold"); doc.setFontSize(10); doc.setTextColor(...INK);
  doc.text(totals, MARGIN, y);
  landlordFooter(doc, profile);
  doc.save(`Rent-Roll-${new Date().toISOString().slice(0, 10)}.pdf`);
}
