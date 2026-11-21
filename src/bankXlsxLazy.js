/* -------------------------------------------------------------------------
   Lazy facade for the Excel generators.

   exceljs is the single largest dependency in the app and is only used when
   exporting a bank schedule as .xlsx. These wrappers load ./bankXlsx.js on
   first use so exceljs stays out of the initial page bundle.
   ------------------------------------------------------------------------- */
const load = () => import("./bankXlsx.js");

const wrap = (name) => (...args) =>
  load()
    .then((m) => m[name](...args))
    .catch((err) => {
      console.error(`${name} failed`, err);
      try { alert("Sorry — couldn't generate that spreadsheet. Please check your connection and try again."); } catch { /* ignore */ }
    });

export const downloadBankReportXlsx = wrap("downloadBankReportXlsx");
export const downloadScheduleXlsx = wrap("downloadScheduleXlsx");
