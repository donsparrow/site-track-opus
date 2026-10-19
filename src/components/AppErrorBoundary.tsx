import { Component, type ErrorInfo, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { isChunkLoadError } from "@/lib/lazyWithReload";
import { resetAppCache } from "@/lib/resetAppCache";

export default class AppErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[AppErrorBoundary]", error, info);
    if (!isChunkLoadError(error)) return;
    try {
      if (["app-boundary-reset", "boot-reset", "chunk-reload"].some((key) => sessionStorage.getItem(key))) return;
      sessionStorage.setItem("app-boundary-reset", "1");
    } catch { return; }
    void resetAppCache();
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <main data-app-load-error className="min-h-screen flex flex-col items-center justify-center gap-5 bg-background text-foreground p-6 text-center">
        <h1 className="text-xl font-semibold">Não foi possível carregar o sistema</h1>
        <Button onClick={() => void resetAppCache()}>Atualizar sistema</Button>
      </main>
    );
  }
}