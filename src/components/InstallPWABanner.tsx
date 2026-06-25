import { useEffect, useState } from "react";
import { Download, Share, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const DISMISSED_KEY = "pwa-install-dismissed";
const ACCEPTED_KEY = "pwa-install-accepted";

export default function InstallPWABanner() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [showIos, setShowIos] = useState(false);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    if (localStorage.getItem(DISMISSED_KEY) || localStorage.getItem(ACCEPTED_KEY)) {
      setHidden(true);
      return;
    }

    // Already installed / running standalone → nothing to do.
    const standalone =
      window.matchMedia?.("(display-mode: standalone)").matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    if (standalone) {
      setHidden(true);
      return;
    }

    const ua = window.navigator.userAgent;
    const isIos = /iphone|ipad|ipod/i.test(ua);
    if (isIos && !(window.navigator as unknown as { standalone?: boolean }).standalone) {
      setShowIos(true);
    }

    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      localStorage.setItem(ACCEPTED_KEY, "1");
      setHidden(true);
      setDeferred(null);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferred) return;
    await deferred.prompt();
    const choice = await deferred.userChoice;
    if (choice.outcome === "accepted") {
      localStorage.setItem(ACCEPTED_KEY, "1");
    } else {
      localStorage.setItem(DISMISSED_KEY, "1");
    }
    setDeferred(null);
  };

  const handleDismiss = () => {
    localStorage.setItem(DISMISSED_KEY, "1");
    setHidden(true);
    setDeferred(null);
    setShowIos(false);
  };

  if (hidden) return null;
  if (!deferred && !showIos) return null;

  return (
    <div className="fixed bottom-4 left-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 rounded-lg border border-border bg-card text-card-foreground shadow-lg">
      <div className="flex items-start gap-3 p-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground">
          {showIos ? <Share className="h-5 w-5" /> : <Download className="h-5 w-5" />}
        </div>
        <div className="flex-1 text-sm">
          {deferred ? (
            <>
              <p className="font-medium">Instalar GestãoPro</p>
              <p className="text-muted-foreground">Tenha acesso rápido direto da tela inicial.</p>
            </>
          ) : (
            <>
              <p className="font-medium">Adicione à Tela de Início</p>
              <p className="text-muted-foreground">Toque em Compartilhar → "Adicionar à Tela de Início".</p>
            </>
          )}
          {deferred && (
            <div className="mt-3 flex gap-2">
              <Button size="sm" onClick={handleInstall}>Instalar</Button>
              <Button size="sm" variant="ghost" onClick={handleDismiss}>Agora não</Button>
            </div>
          )}
        </div>
        <button
          type="button"
          aria-label="Fechar"
          onClick={handleDismiss}
          className="text-muted-foreground hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
