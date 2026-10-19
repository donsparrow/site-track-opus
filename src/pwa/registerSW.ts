// Service Worker registration with strict guards to avoid registering inside
// the Lovable preview/iframe/dev environments (which would cause stale HTML
// and white screens). Only registers in real production deployments.
//
// Updates are applied silently: the new version activates in the background
// and the page reloads only at a safe moment (when the app is hidden, or when
// it becomes visible again after being hidden) — never while the user types.

import { registerSW } from "virtual:pwa-register";

const SW_URL = "/sw.js";

function isPreviewHost(host: string): boolean {
  return (
    host.startsWith("id-preview--") ||
    host.startsWith("preview--") ||
    host === "lovableproject.com" ||
    host.endsWith(".lovableproject.com") ||
    host === "lovableproject-dev.com" ||
    host.endsWith(".lovableproject-dev.com") ||
    host === "beta.lovable.dev" ||
    host.endsWith(".beta.lovable.dev")
  );
}

async function unregisterMatching(): Promise<void> {
  if (!("serviceWorker" in navigator)) return;
  try {
    const regs = await navigator.serviceWorker.getRegistrations();
    await Promise.all(
      regs
        .filter((r) => {
          const u = r.active?.scriptURL || r.installing?.scriptURL || r.waiting?.scriptURL || "";
          return u.endsWith(SW_URL);
        })
        .map((r) => r.unregister()),
    );
  } catch {
    /* ignore */
  }
}

export function registerPWA(): void {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

  const isProd = import.meta.env.PROD;
  const inIframe = window.self !== window.top;
  const swOff = new URLSearchParams(window.location.search).get("sw") === "off";
  const previewHost = isPreviewHost(window.location.hostname);

  if (!isProd || inIframe || swOff || previewHost) {
    // Refuse — clean up any prior registration that might still serve stale HTML.
    void unregisterMatching();
    return;
  }

  let updateReady = false;
  let reloaded = false;
  let registration: ServiceWorkerRegistration | undefined;

  const safeReload = () => {
    if (!updateReady || reloaded) return;
    reloaded = true;
    window.location.reload();
  };

  const updateSW = registerSW({
    immediate: true,
    // Prompt-mode hook: apply in background, no UI, no immediate reload.
    onNeedRefresh() {
      updateReady = true;
      void updateSW(false);
    },
    // autoUpdate-mode hook: replaces the plugin's immediate reload.
    onNeedReload() {
      updateReady = true;
    },
    onRegisteredSW(_url, r) {
      registration = r;
    },
  });

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      safeReload();
    } else {
      safeReload();
      // Look for a newer version whenever the user comes back.
      void registration?.update().catch(() => {});
    }
  });
}
