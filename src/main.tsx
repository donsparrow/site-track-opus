import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { registerPWA } from "./pwa/registerSW";
import { clearChunkReloadFlag, installChunkErrorHandler } from "./lib/lazyWithReload";

installChunkErrorHandler();

const root = document.getElementById("root");
if (!root) throw new Error("App root not found");
createRoot(root).render(<App />);

// App booted fine — allow a future stale-chunk reload again.
const bootTimer = window.setTimeout(() => {
  if (!root.hasChildNodes() || root.querySelector("[data-app-load-error]")) return;
  clearChunkReloadFlag();
  try {
    sessionStorage.removeItem("boot-reset");
    sessionStorage.removeItem("app-boundary-reset");
  } catch { /* ignore unavailable session storage */ }
}, 5000);
window.addEventListener("app-cache-reset", () => window.clearTimeout(bootTimer), { once: true });

registerPWA();
