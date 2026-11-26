"use client";

import { useRef, useState } from "react";
import { sendMessage } from "@/app/(logged)/chat/[id]/actions";

// O envio dá uma viagem até o servidor, e antes disto a tela não dava sinal
// nenhum de que algo estava acontecendo: a pessoa clicava, não via nada e
// clicava de novo — mensagem duplicada (aconteceu 3x em produção com o
// fundador e o Rodrigo, 2026-07-16). Deixar "mais rápido" não resolveria:
// por menor que fosse a janela, ela sempre existiria. O que resolve é o
// primeiro clique travar o botão e dizer que está enviando.
export function MessageComposer({
  conversationId,
  isCouple = false,
  personaOptions,
}: {
  conversationId: string;
  /** Conta de casal: precisa marcar quem dos dois está falando (regra). */
  isCouple?: boolean;
  personaOptions?: { p1: string; p2: string };
}) {
  const [busy, setBusy] = useState(false);
  // Lembra o último "quem falou" dentro da mesma visita, pra não precisar
  // remarcar a cada mensagem — mas nunca vem pré-marcado do servidor.
  const [persona, setPersona] = useState<"p1" | "p2" | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  async function handle(formData: FormData) {
    // O botão desabilitado já barra o segundo clique; isto cobre o Enter
    // repetido, que não passa pelo botão.
    if (busy) return;
    if (!(formData.get("content") as string)?.trim()) return;
    // Casal tem que dizer quem está falando antes de enviar.
    if (isCouple && persona === null) return;

    setBusy(true);
    try {
      await sendMessage(formData);
      // Só limpa depois de dar certo — se limpasse antes, um erro de envio
      // levaria junto o que a pessoa escreveu. O "quem falou" fica como está,
      // de propósito: numa conversa o mesmo parceiro costuma mandar várias.
      formRef.current?.reset();
    } finally {
      setBusy(false);
    }
  }

  const labels = personaOptions ?? { p1: "Pessoa 1", p2: "Pessoa 2" };

  return (
    <form ref={formRef} action={handle} className="mt-6 flex flex-col gap-2">
      <input type="hidden" name="conversation_id" value={conversationId} />
      {isCouple && <input type="hidden" name="persona" value={persona ?? ""} />}

      {isCouple && (
        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted">Quem está falando?</span>
          {(["p1", "p2"] as const).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPersona(p)}
              className={
                persona === p
                  ? "rounded-full bg-accent px-3 py-1 text-xs font-medium text-on-accent"
                  : "rounded-full border border-line px-3 py-1 text-xs text-foreground hover:border-accent"
              }
            >
              {labels[p]}
            </button>
          ))}
        </div>
      )}

      <div className="flex gap-2">
        <input
          type="text"
          name="content"
          placeholder="Escreva uma mensagem"
          required
          autoComplete="off"
          className="input flex-1"
        />
        <button
          type="submit"
          disabled={busy || (isCouple && persona === null)}
          className="btn-primary shrink-0 disabled:opacity-50"
        >
          {busy ? "Enviando…" : "Enviar"}
        </button>
      </div>

      {isCouple && persona === null && (
        <p className="text-xs text-muted">
          Marque quem dos dois está escrevendo pra poder enviar.
        </p>
      )}
    </form>
  );
}
