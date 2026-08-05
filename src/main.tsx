import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { registerPWA } from "./pwa/registerSW";
import { clearChunkReloadFlag, installChunkErrorHandler } from "./lib/lazyWithReload";

installChunkErrorHandler();

createRoot(document.getElementById("root")!).render(<App />);

// App booted fine — allow a future stale-chunk reload again.
window.setTimeout(clearChunkReloadFlag, 5000);

registerPWA();
