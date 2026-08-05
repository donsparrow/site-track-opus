import { lazy, type ComponentType } from "react";

const RELOAD_FLAG = "chunk-reload";

function isChunkLoadError(error: unknown): boolean {
  const msg = error instanceof Error ? error.message : String(error ?? "");
  return (
    /Failed to fetch dynamically imported module/i.test(msg) ||
    /error loading dynamically imported module/i.test(msg) ||
    /Importing a module script failed/i.test(msg) ||
    /ChunkLoadError/i.test(msg)
  );
}

/** Reloads the page once (guarded by sessionStorage) when a stale chunk fails. */
function reloadOnce(): boolean {
  try {
    if (sessionStorage.getItem(RELOAD_FLAG)) return false;
    sessionStorage.setItem(RELOAD_FLAG, "1");
  } catch {
    return false;
  }
  window.location.reload();
  return true;
}

/** Clears the reload guard after a successful boot. */
export function clearChunkReloadFlag(): void {
  try {
    sessionStorage.removeItem(RELOAD_FLAG);
  } catch {
    /* ignore */
  }
}

/** React.lazy with one-time page reload recovery for stale chunks after a deploy. */
export function lazyWithReload<T extends ComponentType<unknown>>(
  factory: () => Promise<{ default: T }>,
) {
  return lazy(() =>
    factory().catch((error: unknown) => {
      if (isChunkLoadError(error) && reloadOnce()) {
        // Keep the promise pending while the page reloads.
        return new Promise<{ default: T }>(() => {});
      }
      throw error;
    }),
  );
}

/** Global listeners for chunk fetch failures outside React.lazy (e.g. vite preload). */
export function installChunkErrorHandler(): void {
  if (typeof window === "undefined") return;

  window.addEventListener("vite:preloadError", (event) => {
    const payload = (event as CustomEvent<{ payload?: unknown }>).detail;
    if (reloadOnce()) event.preventDefault();
    void payload;
  });

  window.addEventListener("unhandledrejection", (event) => {
    if (isChunkLoadError(event.reason) && reloadOnce()) {
      event.preventDefault();
    }
  });
}
