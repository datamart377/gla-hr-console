import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Front-end demo prototype — Vite dev server on port 3003 (matches the
// reference stack). No backend is required: the API client in
// src/api/client.js is backed by an in-memory data store.
export default defineConfig({
  plugins: [react()],
  server: { port: 3003, open: true },
  preview: { port: 3003 },
  // Emit a single JS bundle so the standalone "Open in Safari" file can inline
  // everything (including jsPDF and its optional deps) into one <script>.
  build: {
    chunkSizeWarningLimit: 2000,
    rollupOptions: { output: { inlineDynamicImports: true } },
  },
});
