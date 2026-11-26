"use client";

import { useRef, useState } from "react";
import { compressImage } from "@/lib/compress-image";
import { sendMessage } from "@/app/(logged)/chat/[id]/actions";

type PhotoMode = "fixa" | "temporaria" | "unica";

const MODE_LABELS: Record<PhotoMode, string> = {
  fixa: "Fixa",
  temporaria: "Some em 24h",
  unica: "Visualização única",
};

// O envio dá uma viagem até o servidor, e antes disto a tela não dava sinal
// nenhum de que algo estava acontecendo: a pessoa clicava, não via nada e
// clicava de novo — mensagem duplicada (aconteceu 3x em produção, 2026-07-16).
// O que resolve é o primeiro clique travar o botão e dizer que está enviando.
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
  const [persona, setPersona] = useState<"p1" | "p2" | null>(null);
  const [photo, setPhoto] = useState<File | null>(null);
  const [mode, setMode] = useState<PhotoMode>("fixa");
  const formRef = useRef<HTMLFormElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handle(formData: FormData) {
    // O botão desabilitado já barra o segundo clique; isto cobre o Enter.
    if (busy) return;
    const content = (formData.get("content") as string)?.trim();
    // Ou tem texto, ou tem foto.
    if (!content && !photo) return;
    // Casal tem que dizer quem está falando antes de enviar.
    if (isCouple && persona === null) return;

    setBusy(true);
    try {
      if (photo) {
        // Comprime no navegador pra caber no limite das server actions.
        let f = photo;
        try {
          f = await compressImage(photo);
        } catch {
          // segue com o arquivo original
        }
        formData.set("photo", f, f.name);
        formData.set("photo_mode", mode);
      } else {
        formData.delete("photo");
      }
      await sendMessage(formData);
      formRef.current?.reset();
      setPhoto(null);
      setMode("fixa");
      if (fileRef.current) fileRef.current.value = "";
    } finally {
      setBusy(false);
    }
  }

  const labels = personaOptions ?? { p1: "Pessoa 1", p2: "Pessoa 2" };
  const faltaPersona = isCouple && persona === null;

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

      {/* Anexo de foto: input escondido acionado pelo botão de câmera. */}
      <input
        ref={fileRef}
        type="file"
        name="photo"
        accept="image/*"
        className="hidden"
        onChange={(e) => setPhoto(e.target.files?.[0] ?? null)}
      />

      {photo && (
        <div className="flex flex-col gap-2 rounded-[0.875rem] border border-line p-3 text-sm">
          <div className="flex items-center justify-between gap-2">
            <span className="min-w-0 truncate text-muted">📷 {photo.name}</span>
            <button
              type="button"
              onClick={() => {
                setPhoto(null);
                setMode("fixa");
                if (fileRef.current) fileRef.current.value = "";
              }}
              className="shrink-0 text-xs text-red-400 hover:underline"
            >
              Remover
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-muted">Enviar como:</span>
            {(["fixa", "temporaria", "unica"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                className={
                  mode === m
                    ? "rounded-full bg-accent px-3 py-1 text-xs font-medium text-on-accent"
                    : "rounded-full border border-line px-3 py-1 text-xs text-foreground hover:border-accent"
                }
              >
                {MODE_LABELS[m]}
              </button>
            ))}
          </div>
          {mode === "unica" && (
            <p className="text-xs text-muted">
              A outra pessoa abre uma vez e a foto some. No navegador não dá pra
              impedir print — não envie nada que não possa ser guardado.
            </p>
          )}
          {mode === "temporaria" && (
            <p className="text-xs text-muted">A foto some sozinha 24h depois de enviada.</p>
          )}
        </div>
      )}

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="btn-secondary shrink-0 !px-3"
          aria-label="Anexar foto"
          title="Anexar foto"
        >
          📷
        </button>
        <input
          type="text"
          name="content"
          placeholder={photo ? "Legenda (opcional)" : "Escreva uma mensagem"}
          autoComplete="off"
          className="input flex-1"
        />
        <button
          type="submit"
          disabled={busy || faltaPersona}
          className="btn-primary shrink-0 disabled:opacity-50"
        >
          {busy ? "Enviando…" : "Enviar"}
        </button>
      </div>

      {faltaPersona && (
        <p className="text-xs text-muted">
          Marque quem dos dois está escrevendo pra poder enviar.
        </p>
      )}
    </form>
  );
}
