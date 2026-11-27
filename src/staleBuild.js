/* -------------------------------------------------------------------------
   New-version detection.

   Each deploy gives the code files new names. A page that was open before the
   deploy still asks for the OLD names when it loads an on-demand module (the
   PDF / Excel generators), and those files no longer exist — so the export
   fails. When that happens we reload once to pick up the new version.
   ------------------------------------------------------------------------- */
export const isChunkLoadError = (err) =>
  /Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module|Unable to preload CSS|ChunkLoadError|Loading chunk/i
    .test(String((err && (err.message || err)) || ""));

// Reload to the latest version (at most once a minute, so a real outage can't
// cause a reload loop). Returns true when a reload was started.
export function reloadForNewVersion() {
  try {
    const k = "gla-version-reload";
    const last = Number(sessionStorage.getItem(k) || 0);
    if (Date.now() - last < 60000) return false;
    sessionStorage.setItem(k, String(Date.now()));
  } catch { /* storage blocked — still reload once */ }
  try { alert("The system has just been updated. The page will reload to the latest version — then please try again."); } catch { /* ignore */ }
  window.location.reload();
  return true;
}
