"use client";

import { useEffect, useState } from "react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: string }>;
};

// Ajuda o usuário a instalar o PWA na tela inicial (pré-requisito pro PIN, que
// só vale no modo instalado). Android/Chrome: dispara o prompt nativo. iOS
// Safari: não existe prompt programático, então mostramos o passo a passo.
export function InstallAppButton() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    const nav = navigator as Navigator & { standalone?: boolean };
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches || nav.standalone === true;
    if (standalone) {
      setInstalled(true);
      return;
    }
    const ua = navigator.userAgent;
    setIsIOS(/iphone|ipad|ipod/i.test(ua));

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => setInstalled(true);
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (installed) {
    return (
      <section className="mt-8">
        <h2 className="text-lg">App instalado</h2>
        <p className="mt-1 text-sm text-muted">
          O Lumeo já está na sua tela inicial. Configure o PIN abaixo pra travar o acesso.
        </p>
      </section>
    );
  }

  return (
    <section className="mt-8">
      <h2 className="text-lg">Instalar o Lumeo no celular</h2>
      <p className="mt-1 text-sm text-muted">
        Deixe o Lumeo como um ícone na tela inicial pra abrir rápido — é também o que
        habilita o PIN de acesso rápido (logo abaixo).
      </p>

      {deferred ? (
        <button
          onClick={async () => {
            await deferred.prompt();
            await deferred.userChoice;
            setDeferred(null);
          }}
          className="btn-primary mt-3"
        >
          Instalar o app
        </button>
      ) : isIOS ? (
        <p className="mt-3 text-sm text-foreground/90">
          No iPhone/iPad, pelo <strong>Safari</strong>: toque no botão{" "}
          <strong>Compartilhar</strong> (o quadradinho com a seta pra cima, na barra de
          baixo) e escolha <strong>“Adicionar à Tela de Início”</strong>.
        </p>
      ) : (
        <p className="mt-3 text-sm text-foreground/90">
          No Android, pelo <strong>Chrome</strong>: toque no menu <strong>⋮</strong> (canto
          superior direito) e escolha <strong>“Instalar app”</strong> ou{" "}
          <strong>“Adicionar à tela inicial”</strong>.
        </p>
      )}
    </section>
  );
}
