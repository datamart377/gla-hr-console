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

  const mergeFull = (rowNum) => ws.mergeCells(rowNum, 1, rowNum, NCOLS);
  const bandRow = (text, { font, alignment, height } = {}) => {
    const row = ws.addRow([text]);
    mergeFull(row.number);
    const c = row.getCell(1);
    if (font) c.font = font;
    c.alignment = alignment || { horizontal: "left", vertical: "middle" };
    if (height) row.height = height;
    return row.number;
  };

  // 1) Letterhead — logo floats top-left; address lines right-aligned
  COMPANY.lines.forEach((ln) => bandRow(ln, { font: fnt({ size: 9, color: { argb: MUTED } }), alignment: { horizontal: "right", vertical: "middle" }, height: 15 }));
  while (ws.rowCount < 4) bandRow("", { height: 15 });
  // navy rule
  const ruleRow = ws.addRow([""]); mergeFull(ruleRow.number);
  for (let c = 1; c <= NCOLS; c++) ruleRow.getCell(c).border = { bottom: { style: "medium", color: { argb: NAVY } } };

  // Embed the logo over the top-left letterhead area
  try {
    const imgId = wb.addImage({ base64: GLA_LOGO, extension: "png" });
    ws.addImage(imgId, { tl: { col: 0.05, row: 0.15 }, ext: { width: 176, height: 70 }, editAs: "oneCell" });
  } catch (e) { /* logo optional */ }

  ws.addRow([]); // spacer

  // 2) Title block
  bandRow(eyebrow, { font: fnt({ size: 9, bold: true, color: { argb: ORANGE } }) });
  bandRow(title, { font: fnt({ size: 16, bold: true, color: { argb: INK } }) });
  bandRow(subtitle, { font: fnt({ size: 10, color: { argb: BODY } }) });
  bandRow(`Ref: ${refCode()}  ·  Generated ${todayLong()}`, { font: fnt({ size: 8.5, color: { argb: MUTED } }) });
  ws.addRow([]); // spacer

  // 3) Meta — cheque + total
  if (chequeNo) bandRow(`Cheque No: ${chequeNo}`, { font: fnt({ size: 10, bold: true, color: { argb: INK } }) });
  bandRow(`Total net payable: UGX ${total.toLocaleString("en-US")}`, { font: fnt({ size: 10, bold: true, color: { argb: INK } }) });
  ws.addRow([]); // spacer

  // 4) Table header
  const head = ["#", nameHeader, "Account Number", "Bank", "Branch", "Net Pay (UGX)"];
  const hRow = ws.addRow(head);
  hRow.eachCell((cell, col) => {
    cell.font = fnt({ bold: true, color: { argb: WHITE } });
    cell.fill = solid(NAVY);
    cell.alignment = { horizontal: col === 1 ? "center" : col === 6 ? "right" : "left", vertical: "middle" };
    cell.border = { bottom: { style: "thin", color: { argb: NAVY } } };
  });

  // 5) Data rows
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
  });

  // 6) Total row
  const tRow = ws.addRow(["", "TOTAL NET PAYABLE", "", "", "", total]);
  ws.mergeCells(tRow.number, 2, tRow.number, 5);
  for (let c = 1; c <= NCOLS; c++) {
    const cell = tRow.getCell(c);
    cell.font = fnt({ bold: true, size: 10.5, color: { argb: WHITE } });
    cell.fill = solid(INK);
    cell.alignment = { horizontal: c >= 6 ? "right" : c === 2 ? "left" : "center" };
    if (c === 6) cell.numFmt = "#,##0";
  }

  ws.addRow([]); ws.addRow([]); // spacers

  // 7) Approved signatory block. When a digital sign-off record is supplied, render
  // the two signatures (name, title, digital-signature line and verification code);
  // otherwise fall back to the generic approved signatories.
  bandRow("Approved Signatory", { font: fnt({ size: 11, bold: true, color: { argb: INK } }) });
  const useDigital = Array.isArray(signatories) && signatories.length;
  const s = useDigital
    ? [
        { name: signatories[0]?.name || "", contact: signatories[0]?.title || "", signedText: signatories[0]?.signedText || "", meta: signatories[0]?.signedMeta || signatories[0]?.pending || "" },
        { name: signatories[1]?.name || "", contact: signatories[1]?.title || "", signedText: signatories[1]?.signedText || "", meta: signatories[1]?.signedMeta || signatories[1]?.pending || "" },
      ]
    : SIGNATORIES.map((x) => ({ name: x.name, contact: x.contact, signedText: "", meta: "" }));
  // Digital signature line (green italic name) above the ruled name line.
  const signRow = ws.addRow([s[0].signedText, "", "", s[1].signedText, "", ""]);
  ws.mergeCells(signRow.number, 1, signRow.number, 2);
  ws.mergeCells(signRow.number, 4, signRow.number, 5);
  [1, 4].forEach((c) => { signRow.getCell(c).font = fnt({ italic: true, bold: true, size: 13, color: { argb: "FF155A3C" } }); });
  const nameRow = ws.addRow([s[0].name || "", "", "", s[1].name || "", "", ""]);
  ws.mergeCells(nameRow.number, 1, nameRow.number, 2);
  ws.mergeCells(nameRow.number, 4, nameRow.number, 5);
  [1, 2, 4, 5].forEach((c) => { nameRow.getCell(c).border = { top: { style: "thin", color: { argb: INK } } }; });
  nameRow.getCell(1).font = fnt({ bold: true, size: 10.5, color: { argb: INK } });
  nameRow.getCell(4).font = fnt({ bold: true, size: 10.5, color: { argb: INK } });
  const contactRow = ws.addRow([s[0].contact || "", "", "", s[1].contact || "", "", ""]);
  ws.mergeCells(contactRow.number, 1, contactRow.number, 2);
  ws.mergeCells(contactRow.number, 4, contactRow.number, 5);
  contactRow.getCell(1).font = fnt({ bold: useDigital, size: 9, color: { argb: useDigital ? INK : MUTED } });
  contactRow.getCell(4).font = fnt({ bold: useDigital, size: 9, color: { argb: useDigital ? INK : MUTED } });
  if (useDigital) {
    const metaRow = ws.addRow([s[0].meta || "", "", "", s[1].meta || "", "", ""]);
    ws.mergeCells(metaRow.number, 1, metaRow.number, 2);
    ws.mergeCells(metaRow.number, 4, metaRow.number, 5);
    metaRow.getCell(1).font = fnt({ size: 8, color: { argb: MUTED } });
    metaRow.getCell(4).font = fnt({ size: 8, color: { argb: MUTED } });
  }

  ws.addRow([]);
  bandRow(`${COMPANY.name} · Confidential`, { font: fnt({ size: 8.5, color: { argb: MUTED } }) });

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
