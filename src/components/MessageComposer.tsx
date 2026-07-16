"use client";

import { useRef, useState } from "react";
import { sendMessage } from "@/app/(logged)/chat/[id]/actions";

// O envio dá uma viagem até o servidor, e antes disto a tela não dava sinal
// nenhum de que algo estava acontecendo: a pessoa clicava, não via nada e
// clicava de novo — mensagem duplicada (aconteceu 3x em produção com o
// fundador e o Rodrigo, 2026-07-16). Deixar "mais rápido" não resolveria:
// por menor que fosse a janela, ela sempre existiria. O que resolve é o
// primeiro clique travar o botão e dizer que está enviando.
export function MessageComposer({ conversationId }: { conversationId: string }) {
  const [busy, setBusy] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  async function handle(formData: FormData) {
    // O botão desabilitado já barra o segundo clique; isto cobre o Enter
    // repetido, que não passa pelo botão.
    if (busy) return;
    if (!(formData.get("content") as string)?.trim()) return;

    setBusy(true);
    try {
      await sendMessage(formData);
      // Só limpa depois de dar certo — se limpasse antes, um erro de envio
      // levaria junto o que a pessoa escreveu.
      formRef.current?.reset();
    } finally {
      setBusy(false);
    }
  }

  return (
    <form ref={formRef} action={handle} className="mt-6 flex gap-2">
      <input type="hidden" name="conversation_id" value={conversationId} />
      <input
        type="text"
        name="content"
        placeholder="Escreva uma mensagem"
        required
        autoComplete="off"
        className="input flex-1"
      />
      <button type="submit" disabled={busy} className="btn-primary shrink-0">
        {busy ? "Enviando…" : "Enviar"}
      </button>
    </form>
  );
}
