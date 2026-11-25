"use client";

import { useRef, useState } from "react";
import { enviarMensagemGrupo } from "@/app/(logged)/eventos/[id]/grupo/actions";

// Mesma trava do chat 1-a-1: o primeiro clique desabilita o botão e mostra
// "Enviando…", pra ninguém clicar duas vezes e mandar a mensagem duplicada.
export function GroupMessageComposer({ eventId }: { eventId: string }) {
  const [busy, setBusy] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  async function handle(formData: FormData) {
    if (busy) return;
    if (!(formData.get("content") as string)?.trim()) return;

    setBusy(true);
    try {
      await enviarMensagemGrupo(formData);
      formRef.current?.reset();
    } finally {
      setBusy(false);
    }
  }

  return (
    <form ref={formRef} action={handle} className="mt-6 flex gap-2">
      <input type="hidden" name="event_id" value={eventId} />
      <input
        type="text"
        name="content"
        placeholder="Escreva pro grupo"
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
