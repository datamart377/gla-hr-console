/* -------------------------------------------------------------------------
   Lazy facade for the Excel generators.

   exceljs is the single largest dependency in the app and is only used when
   exporting a bank schedule as .xlsx. These wrappers load ./bankXlsx.js on
   first use so exceljs stays out of the initial page bundle.
   ------------------------------------------------------------------------- */
import { isChunkLoadError, reloadForNewVersion } from "./staleBuild.js";

const load = () => import("./bankXlsx.js");

const wrap = (name) => (...args) =>
  load()
    // m is undefined when the page is already reloading to a new version.
    .then((m) => (m && m[name] ? m[name](...args) : undefined), (err) => {
      // Couldn't load the generator: usually a page opened before an update.
      console.error(`${name}: loading the Excel module failed`, err);
      if (isChunkLoadError(err) && reloadForNewVersion()) return;
      try { alert("Sorry — couldn't load the spreadsheet tool. Please check your connection, refresh the page and try again."); } catch { /* ignore */ }
    })
    .catch((err) => {
      console.error(`${name} failed`, err);
      try { alert("Sorry — couldn't generate that spreadsheet." + (err && err.message ? "\n\n" + err.message : "")); } catch { /* ignore */ }
    });

export const downloadBankReportXlsx = wrap("downloadBankReportXlsx");
export const downloadScheduleXlsx = wrap("downloadScheduleXlsx");
