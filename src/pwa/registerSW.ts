// Service Worker registration with strict guards to avoid registering inside
// the Lovable preview/iframe/dev environments (which would cause stale HTML
// and white screens). Only registers in real production deployments.

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

  window.addEventListener("load", () => {
    navigator.serviceWorker.register(SW_URL).catch(() => {
      /* ignore */
    });
  });
}
