import { beforeEach, describe, expect, it, vi } from "vitest";

describe("app shell recovery", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.restoreAllMocks();
    sessionStorage.clear();
  });

  it("removes legacy app caches without selecting unrelated messaging caches", async () => {
    const { isAppCache } = await import("./resetAppCache");
    expect(isAppCache("html-cache")).toBe(true);
    expect(isAppCache("supabase-cache")).toBe(true);
    expect(isAppCache(`workbox-precache-v2-${location.origin}/`)).toBe(true);
    expect(isAppCache("firebase-messaging-cache")).toBe(false);
    expect(isAppCache(`workbox-precache-v2-${location.origin}/push/`)).toBe(false);
  });

  it("handles all four supported chunk failure messages", async () => {
    const { isChunkLoadError } = await import("./lazyWithReload");
    for (const message of ["Failed to fetch dynamically imported module", "error loading dynamically imported module", "Importing a module script failed", "ChunkLoadError"]) {
      expect(isChunkLoadError(new Error(message))).toBe(true);
    }
    expect(isChunkLoadError(new Error("Permission denied"))).toBe(false);
  });

  it("does not reset a second time during the same failed boot", async () => {
    const reset = vi.fn();
    vi.doMock("./resetAppCache", () => ({ resetAppCache: reset }));
    sessionStorage.setItem("boot-reset", "1");
    const { installChunkErrorHandler } = await import("./lazyWithReload");
    installChunkErrorHandler();
    window.dispatchEvent(new Event("vite:preloadError", { cancelable: true }));
    expect(reset).not.toHaveBeenCalled();
    sessionStorage.removeItem("boot-reset");
    window.dispatchEvent(new Event("vite:preloadError", { cancelable: true }));
    window.dispatchEvent(new Event("vite:preloadError", { cancelable: true }));
    expect(reset).toHaveBeenCalledTimes(1);
    expect(sessionStorage.getItem("chunk-reload")).toBe("1");
  });
});