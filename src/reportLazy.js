/* -------------------------------------------------------------------------
   Lazy facade for the PDF generators.

   jsPDF + jspdf-autotable + the base64 letterhead are heavy and only needed
   when the user actually exports a document. These wrappers keep the exact same
   call signatures the app already uses, but load ./reportPdf.js on first use so
   those libraries stay out of the initial page bundle.
   ------------------------------------------------------------------------- */
import { isChunkLoadError, reloadForNewVersion } from "./staleBuild.js";

const load = () => import("./reportPdf.js");

const wrap = (name) => (...args) =>
  load()
    // m is undefined when the page is already reloading to a new version.
    .then((m) => (m && m[name] ? m[name](...args) : undefined), (err) => {
      // Couldn't load the generator: usually a page opened before an update.
      console.error(`${name}: loading the PDF module failed`, err);
      if (isChunkLoadError(err) && reloadForNewVersion()) return;
      try { alert("Sorry — couldn't load the PDF tool. Please check your connection, refresh the page and try again."); } catch { /* ignore */ }
    })
    .catch((err) => {
      console.error(`${name} failed`, err);
      try { alert("Sorry — couldn't generate that file." + (err && err.message ? "\n\n" + err.message : "")); } catch { /* ignore */ }
    });

export const downloadReportPdf = wrap("downloadReportPdf");
export const downloadDocumentPdf = wrap("downloadDocumentPdf");
export const downloadRequisitionVoucherPdf = wrap("downloadRequisitionVoucherPdf");
export const downloadPurchaseOrderPdf = wrap("downloadPurchaseOrderPdf");
export const downloadQuotationPdf = wrap("downloadQuotationPdf");
export const downloadServiceCertificatePdf = wrap("downloadServiceCertificatePdf");
export const downloadRentReceiptPdf = wrap("downloadRentReceiptPdf");
export const downloadTenantStatementPdf = wrap("downloadTenantStatementPdf");
export const downloadRentRollPdf = wrap("downloadRentRollPdf");
