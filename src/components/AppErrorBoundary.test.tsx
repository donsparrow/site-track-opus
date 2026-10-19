import { render, cleanup } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import AppErrorBoundary from "./AppErrorBoundary";

const reset = vi.hoisted(() => vi.fn());
vi.mock("@/lib/resetAppCache", () => ({ resetAppCache: reset }));

function BrokenScreen({ message }: { message: string }): never {
  throw new Error(message);
}

describe("app error recovery", () => {
  beforeEach(() => {
    sessionStorage.clear();
    reset.mockClear();
    vi.spyOn(console, "error").mockImplementation(() => {});
  });
  afterEach(() => { cleanup(); vi.restoreAllMocks(); });

  it("automatically resets a chunk failure only once per failed boot", () => {
    render(<AppErrorBoundary><BrokenScreen message="ChunkLoadError" /></AppErrorBoundary>);
    expect(reset).toHaveBeenCalledTimes(1);
    expect(sessionStorage.getItem("app-boundary-reset")).toBe("1");
    cleanup();
    render(<AppErrorBoundary><BrokenScreen message="ChunkLoadError" /></AppErrorBoundary>);
    expect(reset).toHaveBeenCalledTimes(1);
  });

  it("does not automatically reset unrelated application errors", () => {
    render(<AppErrorBoundary><BrokenScreen message="Permission denied" /></AppErrorBoundary>);
    expect(reset).not.toHaveBeenCalled();
  });

  it("respects the earlier boot recovery guard", () => {
    sessionStorage.setItem("boot-reset", "1");
    render(<AppErrorBoundary><BrokenScreen message="ChunkLoadError" /></AppErrorBoundary>);
    expect(reset).not.toHaveBeenCalled();
  });
});