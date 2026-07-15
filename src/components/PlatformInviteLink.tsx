"use client";

import { useState } from "react";

// Mostra o link de convite recém-gerado com um botão de copiar. Depois de
// copiado, o link some (vira uma confirmação) — assim a página não acumula
// links pendentes. O link em si continua válido no banco (uso único); some
// só da tela, pra manter o /inicio limpo.
export function PlatformInviteLink({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  const path = `/cadastro/dados?code=${code}`;

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}${path}`);
    } catch {
      // Se a área de transferência falhar, mantém o link visível pra tentar de novo.
      return;
    }
    setCopied(true);
  }

  if (copied) {
    return (
      <p className="mt-4 text-sm text-green-300">
        Link copiado! Já pode enviar pra pessoa que você quer convidar. Gere um novo link para
        cada próxima pessoa.
      </p>
    );
  }

  return (
    <div className="mt-4 flex flex-wrap items-center gap-2">
      <code className="break-all rounded-lg bg-background/40 px-2 py-1 text-xs text-muted">
        {path}
      </code>
      <button type="button" onClick={handleCopy} className="btn-secondary">
        Copiar link
      </button>
    </div>
  );
}
