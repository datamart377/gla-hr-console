import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Front-end demo prototype — Vite dev server on port 3003 (matches the
// reference stack). No backend is required: the API client in
// src/api/client.js is backed by an in-memory data store.
export default defineConfig({
  plugins: [react()],
  server: { port: 3003, open: true },
  preview: { port: 3003 },
  // Production (served by Express/Render) is code-split: the heavy PDF (jsPDF),
  // Excel (exceljs) and map (leaflet) libraries load on demand instead of in the
  // initial bundle, so the app opens fast on slow connections. Set STANDALONE=1
  // to instead inline everything into one <script> for the "Open in Safari" file.
  build: {
    chunkSizeWarningLimit: 900,
    rollupOptions: process.env.STANDALONE === "1"
      ? { output: { inlineDynamicImports: true } }
      : {
          output: {
            manualChunks(id) {
              if (id.includes("node_modules/react") || id.includes("node_modules/scheduler")) return "react-vendor";
            },
          },
        },
  },
});
