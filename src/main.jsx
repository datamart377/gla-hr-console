import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import "leaflet/dist/leaflet.css";
import "./index.css";
import { reloadForNewVersion } from "./staleBuild.js";

// Vite fires this when an on-demand file from an older deploy can't be loaded.
window.addEventListener("vite:preloadError", (e) => { if (reloadForNewVersion()) e.preventDefault(); });

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
