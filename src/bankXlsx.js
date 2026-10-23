/* -------------------------------------------------------------------------
   Excel (.xlsx) version of the Staff Bank Payment Schedule Report — a faithful
   copy of the branded PDF (logo letterhead, title block, cheque, table, total
   and approved-signatory block). Built with ExcelJS so the embedded GLA logo
   and styling open reliably in Excel, Google Sheets and Numbers.
   Shared by the live Monthly Salary Ledger and processed payroll runs.
   ------------------------------------------------------------------------- */
import ExcelJS from "exceljs";
import { COMPANY, SIGNATORIES } from "./reportPdf.js";
import { GLA_LOGO } from "./logo.js";

const argb = (hex) => "FF" + hex;
const NAVY = argb("103754");
const ORANGE = argb("E86C2B");
const INK = argb("10131A");
const BODY = argb("464E58");
const MUTED = argb("8C949D");
const ZEBRA = argb("F4F7F9");
const RULE = argb("D6DCE2");
const WHITE = argb("FFFFFF");
const GREEN = argb("155A3C");
const NCOLS = 6;

const refCode = () => {
  const d = new Date();
  const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
  return `GLA/RPT/${ymd}/${String(Math.floor(Date.now() % 900) + 100)}`;
};
const todayLong = () =>
  new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });

const fnt = (o = {}) => ({ name: "Calibri", size: 10, color: { argb: BODY }, ...o });
const solid = (c) => ({ type: "pattern", pattern: "solid", fgColor: { argb: c } });

function triggerDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.style.display = "none"; a.href = url; a.download = filename;
  document.body.appendChild(a); a.click();
  setTimeout(() => { URL.revokeObjectURL(url); document.body.removeChild(a); }, 120);
}

/**
 * Build and download the bank report workbook (with embedded logo).
 * @param {Object} p
 * @param {string} p.title     report title (default staff bank report)
 * @param {string} p.eyebrow   small label above the title
 * @param {string} p.nameHeader header for the name column
 * @param {string} p.subtitle  e.g. "September 2026 · net salaries payable"
 * @param {string} p.chequeNo  optional cheque number
 * @param {Array}  p.rows      [{ no, name, account, bank, branch, net }]
 * @param {string} p.filename  output file name (.xlsx)
 */
export async function downloadBankReportXlsx({ title = "Staff Bank Payment Schedule Report", eyebrow = "PAYMENT", nameHeader = "Name", subtitle, chequeNo, rows, filename, signatories = null }) {
  const total = rows.reduce((s, r) => s + (Number(r.net) || 0), 0);
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Bank Report", {
    pageSetup: { orientation: "portrait", fitToPage: true, fitToWidth: 1, fitToHeight: 0, margins: { left: 0.5, right: 0.5, top: 0.6, bottom: 0.6, header: 0.3, footer: 0.3 } },
    views: [{ showGridLines: false }],
  });
  ws.columns = [{ width: 5 }, { width: 24 }, { width: 18 }, { width: 16 }, { width: 15 }, { width: 16 }];

  const merge = (r, a, b) => ws.mergeCells(r, a, r, b);
  const bandRow = (text, { font, alignment, height } = {}) => {
    const row = ws.addRow([text]); merge(row.number, 1, NCOLS);
    const c = row.getCell(1); if (font) c.font = font;
    c.alignment = alignment || { horizontal: "left", vertical: "middle" };
    if (height) row.height = height; return row;
  };

  // Branded letterhead — logo top-left, address lines right-aligned, orange/navy split rule.
  const letterhead = () => {
    const first = ws.rowCount + 1;
    COMPANY.lines.forEach((ln) => bandRow(ln, { font: fnt({ size: 9, color: { argb: MUTED } }), alignment: { horizontal: "right", vertical: "middle" }, height: 15 }));
    while (ws.rowCount < first + 3) bandRow("", { height: 15 });
    const ruleRow = ws.addRow([""]); merge(ruleRow.number, 1, NCOLS);
    for (let c = 1; c <= NCOLS; c++) ruleRow.getCell(c).border = { bottom: { style: "medium", color: { argb: c <= 2 ? ORANGE : NAVY } } };
    try { const id = wb.addImage({ base64: GLA_LOGO, extension: "png" }); ws.addImage(id, { tl: { col: 0.05, row: first - 1 + 0.15 }, ext: { width: 176, height: 70 }, editAs: "oneCell" }); } catch (e) { /* logo optional */ }
  };

  letterhead();
  ws.addRow([]);

  // Title block — eyebrow, title (left) + ref (right), subtitle (left) + generated (right).
  bandRow(eyebrow, { font: fnt({ size: 9, bold: true, color: { argb: ORANGE } }) });
  const tr = ws.addRow([title, "", "", "", refCode(), ""]);
  merge(tr.number, 1, 4); merge(tr.number, 5, 6); tr.height = 22;
  tr.getCell(1).font = fnt({ size: 16, bold: true, color: { argb: INK } });
  tr.getCell(1).alignment = { horizontal: "left", vertical: "middle" };
  tr.getCell(5).font = fnt({ size: 8.5, color: { argb: MUTED } });
  tr.getCell(5).alignment = { horizontal: "right", vertical: "middle" };
  const sr = ws.addRow([subtitle || "", "", "", "", `Generated ${todayLong()}`, ""]);
  merge(sr.number, 1, 4); merge(sr.number, 5, 6);
  sr.getCell(1).font = fnt({ size: 10, color: { argb: BODY } });
  sr.getCell(1).alignment = { horizontal: "left", vertical: "middle" };
  sr.getCell(5).font = fnt({ size: 8.5, color: { argb: MUTED } });
  sr.getCell(5).alignment = { horizontal: "right", vertical: "middle" };
  ws.addRow([]);

  // Meta block — cheque, total, and (for sign-off reports) the approval status, like the PDF.
  const metaLines = [
    ...(chequeNo ? [`Cheque No: ${chequeNo}`] : []),
    `Total net payable: UGX ${total.toLocaleString("en-US")}`,
  ];
  if (Array.isArray(signatories) && signatories.length) {
    const a = !!signatories[0]?.signedText, b = !!signatories[1]?.signedText;
    const status = a && b ? "AUTHORIZED FOR THE BANK" : a ? "CERTIFIED — awaiting Managing Director authorization" : "DRAFT — awaiting signatures";
    metaLines.push(`Status: ${status}`);
  }
  metaLines.forEach((m) => bandRow(m, { font: fnt({ size: 10, bold: true, color: { argb: INK } }) }));
  ws.addRow([]);

  // Table header
  const head = ["#", nameHeader, "Account Number", "Bank", "Branch", "Net Pay (UGX)"];
  const hRow = ws.addRow(head);
  hRow.eachCell((cell, col) => {
    cell.font = fnt({ bold: true, color: { argb: WHITE } });
    cell.fill = solid(NAVY);
    cell.alignment = { horizontal: col === 1 ? "center" : col === 6 ? "right" : "left", vertical: "middle" };
    cell.border = { bottom: { style: "thin", color: { argb: NAVY } } };
  });
  hRow.height = 20;

  // Data rows
  rows.forEach((row, i) => {
    const rr = ws.addRow([row.no ?? i + 1, row.name || "", row.account || "", row.bank || "", row.branch || "", Number(row.net) || 0]);
    const zebra = i % 2 === 1;
    rr.eachCell((cell, col) => {
      cell.font = fnt({ color: { argb: INK } });
      cell.alignment = { horizontal: col === 1 ? "center" : col === 6 ? "right" : "left" };
      cell.border = { bottom: { style: "hair", color: { argb: RULE } } };
      if (zebra) cell.fill = solid(ZEBRA);
      if (col === 6) cell.numFmt = "#,##0";
    });
    rr.height = 18;
  });

  // Total row
  const tRow = ws.addRow(["", "TOTAL NET PAYABLE", "", "", "", total]);
  merge(tRow.number, 2, 5);
  for (let c = 1; c <= NCOLS; c++) {
    const cell = tRow.getCell(c);
    cell.font = fnt({ bold: true, size: 10.5, color: { argb: WHITE } });
    cell.fill = solid(INK);
    cell.alignment = { horizontal: c >= 6 ? "right" : c === 2 ? "left" : "center", vertical: "middle" };
    if (c === 6) cell.numFmt = "#,##0";
  }
  tRow.height = 20;

  // Page 2 — repeated letterhead + approved-signatory block (matches the PDF).
  tRow.addPageBreak();
  letterhead();
  ws.addRow([]);
  bandRow("Approved Signatory", { font: fnt({ size: 11, bold: true, color: { argb: INK } }) });
  ws.addRow([]);

  const s = (Array.isArray(signatories) && signatories.length ? signatories : SIGNATORIES).map((x) => ({
    label: x.title || x.name || "",
    above: x.signedText || x.pending || "",
    signed: !!x.signedText,
    meta: x.signedMeta || "",
  }));
  const twoCol = (vals) => {
    const row = ws.addRow([vals[0] || "", "", "", vals[1] || "", "", ""]);
    merge(row.number, 1, 2); merge(row.number, 4, 5); return row;
  };
  const aboveRow = twoCol([s[0]?.above, s[1]?.above]);
  [1, 4].forEach((c) => { const sg = s[c === 1 ? 0 : 1] || {}; aboveRow.getCell(c).font = fnt({ italic: true, bold: sg.signed, size: sg.signed ? 13 : 10, color: { argb: sg.signed ? GREEN : MUTED } }); aboveRow.getCell(c).alignment = { horizontal: "center", vertical: "bottom" }; });
  aboveRow.height = 22;
  const lineRow = twoCol(["", ""]);
  [1, 2, 4, 5].forEach((c) => { lineRow.getCell(c).border = { top: { style: "thin", color: { argb: INK } } }; });
  const labelRow = twoCol([s[0]?.label, s[1]?.label]);
  [1, 4].forEach((c) => { labelRow.getCell(c).font = fnt({ bold: true, size: 10.5, color: { argb: INK } }); labelRow.getCell(c).alignment = { horizontal: "center", vertical: "top" }; });
  if (s.some((x) => x.meta)) {
    const metaRow = twoCol([s[0]?.meta, s[1]?.meta]);
    [1, 4].forEach((c) => { metaRow.getCell(c).font = fnt({ size: 8, color: { argb: MUTED } }); metaRow.getCell(c).alignment = { horizontal: "center" }; });
  }

  // Page footer on every printed page — confidential (left) · page x of y (right).
  ws.headerFooter.oddFooter = `&L&8&KA0A0A0${COMPANY.name} · Confidential&R&8&KA0A0A0Page &P of &N`;
  ws.headerFooter.evenFooter = ws.headerFooter.oddFooter;

  const buf = await wb.xlsx.writeBuffer();
  triggerDownload(new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }), filename || "GLA-Bank-Report.xlsx");
}

/**
 * Generic branded schedule workbook (logo letterhead, title block, table, totals,
 * approved-signatory block) with arbitrary columns — reused by statutory reports.
 * @param {Object} p
 * @param {string} p.title
 * @param {string} p.eyebrow
 * @param {string} p.subtitle
 * @param {string[]} [p.meta]      extra bold meta lines under the subtitle
 * @param {Array} p.columns        [{ header, money?, align?, width? }]
 * @param {Array} p.rows           array of row arrays (raw values; money cells numeric)
 * @param {Array} [p.totalsRow]    optional totals row (array of values)
 * @param {boolean} [p.signatories=true]
 * @param {string} p.filename
 */
export async function downloadScheduleXlsx({ title, eyebrow = "REPORT", subtitle, meta = [], columns, rows, totalsRow, signatories = true, filename }) {
  const N = columns.length;
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Report", {
    pageSetup: { orientation: "landscape", fitToPage: true, fitToWidth: 1, fitToHeight: 0, margins: { left: 0.4, right: 0.4, top: 0.5, bottom: 0.5, header: 0.3, footer: 0.3 } },
    views: [{ showGridLines: false }],
  });
  ws.columns = columns.map((c) => ({ width: c.width || (c.money ? 15 : 18) }));
  const merge = (r) => ws.mergeCells(r, 1, r, N);
  const band = (text, style) => { const row = ws.addRow([text]); merge(row.number); const c = row.getCell(1); if (style?.font) c.font = style.font; c.alignment = style?.alignment || { horizontal: "left" }; if (style?.height) row.height = style.height; return row.number; };

  COMPANY.lines.forEach((ln) => band(ln, { font: fnt({ size: 9, color: { argb: MUTED } }), alignment: { horizontal: "right" }, height: 15 }));
  while (ws.rowCount < 4) band("", { height: 15 });
  const rule = ws.addRow([""]); merge(rule.number);
  for (let c = 1; c <= N; c++) rule.getCell(c).border = { bottom: { style: "medium", color: { argb: NAVY } } };
  try { const imgId = wb.addImage({ base64: GLA_LOGO, extension: "png" }); ws.addImage(imgId, { tl: { col: 0.05, row: 0.15 }, ext: { width: 176, height: 70 }, editAs: "oneCell" }); } catch (e) {}

  ws.addRow([]);
  band(eyebrow, { font: fnt({ size: 9, bold: true, color: { argb: ORANGE } }) });
  band(title, { font: fnt({ size: 16, bold: true, color: { argb: INK } }) });
  if (subtitle) band(subtitle, { font: fnt({ size: 10, color: { argb: BODY } }) });
  band(`Ref: ${refCode()}  ·  Generated ${todayLong()}`, { font: fnt({ size: 8.5, color: { argb: MUTED } }) });
  meta.forEach((m) => band(m, { font: fnt({ size: 10, bold: true, color: { argb: INK } }) }));
  ws.addRow([]);

  const hRow = ws.addRow(columns.map((c) => c.header));
  hRow.eachCell((cell, col) => {
    const c = columns[col - 1];
    cell.font = fnt({ bold: true, color: { argb: WHITE } });
    cell.fill = solid(NAVY);
    cell.alignment = { horizontal: c.align || (c.money ? "right" : col === 1 ? "center" : "left"), vertical: "middle" };
    cell.border = { bottom: { style: "thin", color: { argb: NAVY } } };
  });
  rows.forEach((r, i) => {
    const rr = ws.addRow(r);
    const zebra = i % 2 === 1;
    rr.eachCell((cell, col) => {
      const c = columns[col - 1];
      cell.font = fnt({ color: { argb: INK } });
      cell.alignment = { horizontal: c.align || (c.money ? "right" : col === 1 ? "center" : "left") };
      cell.border = { bottom: { style: "hair", color: { argb: RULE } } };
      if (zebra) cell.fill = solid(ZEBRA);
      if (c.money) cell.numFmt = "#,##0";
    });
  });
  if (totalsRow) {
    const tr = ws.addRow(totalsRow);
    tr.eachCell((cell, col) => {
      const c = columns[col - 1];
      cell.font = fnt({ bold: true, size: 10.5, color: { argb: WHITE } });
      cell.fill = solid(INK);
      cell.alignment = { horizontal: c.align || (c.money ? "right" : col === 1 ? "center" : "left") };
      if (c.money) cell.numFmt = "#,##0";
    });
  }

  if (signatories) {
    ws.addRow([]); ws.addRow([]);
    band("Approved Signatory", { font: fnt({ size: 11, bold: true, color: { argb: INK } }) });
    ws.addRow([]);
    const s = SIGNATORIES;
    const nameRow = ws.addRow([s[0]?.name || "", "", "", s[1]?.name || ""]);
    nameRow.getCell(1).font = fnt({ bold: true, size: 10.5, color: { argb: INK } });
    nameRow.getCell(4).font = fnt({ bold: true, size: 10.5, color: { argb: INK } });
    [1, 2, 4, 5].forEach((c) => { if (c <= N) nameRow.getCell(c).border = { top: { style: "thin", color: { argb: INK } } }; });
    const contactRow = ws.addRow([s[0]?.contact || "", "", "", s[1]?.contact || ""]);
    contactRow.getCell(1).font = fnt({ size: 9, color: { argb: MUTED } });
    contactRow.getCell(4).font = fnt({ size: 9, color: { argb: MUTED } });
  }
  ws.addRow([]);
  band(`${COMPANY.name} · Confidential`, { font: fnt({ size: 8.5, color: { argb: MUTED } }) });

  const buf = await wb.xlsx.writeBuffer();
  triggerDownload(new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }), filename || "GLA-Report.xlsx");
}
