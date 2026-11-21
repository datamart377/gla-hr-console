/* -------------------------------------------------------------------------
   Lazy facade for the PDF generators.

   jsPDF + jspdf-autotable + the base64 letterhead are heavy and only needed
   when the user actually exports a document. These wrappers keep the exact same
   call signatures the app already uses, but load ./reportPdf.js on first use so
   those libraries stay out of the initial page bundle.
   ------------------------------------------------------------------------- */
const load = () => import("./reportPdf.js");

const wrap = (name) => (...args) =>
  load()
    .then((m) => m[name](...args))
    .catch((err) => {
      console.error(`${name} failed`, err);
      try { alert("Sorry — couldn't generate that file. Please check your connection and try again."); } catch { /* ignore */ }
    });

export const downloadReportPdf = wrap("downloadReportPdf");
export const downloadDocumentPdf = wrap("downloadDocumentPdf");
export const downloadRequisitionVoucherPdf = wrap("downloadRequisitionVoucherPdf");
export const downloadPurchaseOrderPdf = wrap("downloadPurchaseOrderPdf");
