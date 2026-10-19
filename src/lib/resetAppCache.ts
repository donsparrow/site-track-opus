// Keep recovery scoped to the app shell; never clear auth storage or messaging caches.
const LEGACY_CACHES = new Set(["html-cache", "asset-cache", "image-cache", "supabase-cache", "app-navigation-cache"]);
let resetting = false;

export function isAppCache(name: string): boolean {
  return LEGACY_CACHES.has(name) || (
    /(^|-)precache-v\d+-|(^|-)runtime-|(^|-)googleAnalytics-/.test(name) &&
    name.endsWith(`${window.location.origin}/`)
  );
}

export async function resetAppCache(): Promise<void> {
  if (resetting) return;
  resetting = true;
  window.dispatchEvent(new Event("app-cache-reset"));
  try {
    if ("serviceWorker" in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.allSettled(regs.filter((r) =>
        [r.active, r.waiting, r.installing].some((worker) => {
          if (!worker) return false;
          const url = new URL(worker.scriptURL);
          return url.origin === window.location.origin && ["/sw.js", "/service-worker.js"].includes(url.pathname);
        }),
      ).map((r) => r.unregister()));
    }
  } catch { /* recovery must continue even if unregister fails */ }
  try {
    if ("caches" in window) {
      const keys = await caches.keys();
      await Promise.allSettled(keys.filter(isAppCache).map((key) => caches.delete(key)));
    }
  } catch { /* recovery must continue even if cache deletion fails */ }
  window.location.reload();
}