"use client";

import { useState } from "react";
import { deleteMessage, editMessage, revelarFotoUnica } from "@/app/(logged)/chat/[id]/actions";
import { formatarDataHora } from "@/lib/datas";

export type ChatMessage = {
  id: string;
  content: string;
  sent_at: string;
  edited_at: string | null;
  deleted_at: string | null;
};

// Como a foto desta mensagem deve aparecer, já resolvido no servidor.
//  - "image":          mostra a foto (url pronta). Modo dá o rótulo.
//  - "once-available": visualização única ainda não vista — botão pra revelar.
//  - "once-gone":      única já aberta (ou revelada agora).
//  - "expired":        temporária que passou das 24h.
export type ChatPhoto = {
  kind: "image" | "once-available" | "once-gone" | "expired";
  url?: string | null;
  mode?: "fixa" | "temporaria" | "unica" | null;
};

export function MessageBubble({
  message,
  conversationId,
  isMine,
  unread,
  personaLabel,
  photo,
}: {
  message: ChatMessage;
  conversationId: string;
  isMine: boolean;
  /** Recibo de leitura: mensagem MINHA que o destinatário ainda não leu. */
  unread: boolean;
  /** "Quem falou" num perfil de casal (Ele/Ela/Pessoa 1/2). Null = individual. */
  personaLabel?: string | null;
  /** Foto da mensagem, já resolvida no servidor. Null = mensagem só de texto. */
  photo?: ChatPhoto | null;
}) {
  const [editing, setEditing] = useState(false);
  const [revelando, setRevelando] = useState(false);
  const [urlRevelada, setUrlRevelada] = useState<string | null>(null);
  const [revelada, setRevelada] = useState(false);
  const deleted = !!message.deleted_at;

  async function revelar() {
    if (revelando) return;
    setRevelando(true);
    try {
      const url = await revelarFotoUnica(message.id);
      if (url) setUrlRevelada(url);
      else setRevelada(true); // já tinha sido vista / expirou
    } finally {
      setRevelando(false);
    }
  }

  const base = "flex max-w-[75%] flex-col gap-1 rounded-[18px] px-3 py-2 text-sm";
  const side = isMine
    ? "self-end bg-accent text-on-accent"
    : "self-start border border-line bg-surface text-foreground";
  const metaColor = isMine ? "text-on-accent/70" : "text-muted";

  // Mensagem excluída não tem texto pra mostrar (o banco limpou) nem ações —
  // vira só um rastro, pros dois lados, pra conversa não ficar com buraco.
  if (deleted) {
    return (
      <li
        className={`${base} ${
          isMine ? "self-end" : "self-start"
        } border border-line bg-surface/50 italic text-muted`}
      >
        {personaLabel && (
          <span className="text-xs font-semibold not-italic text-muted">{personaLabel}</span>
        )}
        <span>Mensagem apagada</span>
        <span className="text-xs not-italic text-muted">
          {formatarDataHora(message.sent_at)}
        </span>
      </li>
    );
  }

  if (editing) {
    return (
      <li className={`${base} ${side}`}>
        <form
          action={editMessage}
          onSubmit={() => setEditing(false)}
          className="flex flex-col gap-2"
        >
          <input type="hidden" name="conversation_id" value={conversationId} />
          <input type="hidden" name="message_id" value={message.id} />
          <input
            type="text"
            name="content"
            defaultValue={message.content}
            required
            autoFocus
            className="input !py-1 !text-sm text-foreground"
          />
          <div className="flex gap-2">
            <button type="submit" className="btn-secondary !px-2 !py-1 !text-xs">
              Salvar
            </button>
            <button
              type="button"
              onClick={() => setEditing(false)}
              className={`text-xs ${metaColor} hover:underline`}
            >
              Cancelar
            </button>
          </div>
        </form>
      </li>
    );
  }

  const modeTag =
    photo?.kind === "image" && photo.mode === "temporaria"
      ? "some em 24h"
      : photo?.kind === "image" && photo.mode === "unica"
        ? "visualização única"
        : null;

  return (
    <li className={`${base} ${side} ${unread ? "font-bold" : "font-normal"}`}>
      {personaLabel && (
        <span className={`text-xs font-semibold ${metaColor}`}>{personaLabel}</span>
      )}

      {photo && !revelada && (
        <>
          {photo.kind === "image" && photo.url && (
            <div className="flex flex-col gap-1">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={photo.url}
                alt=""
                className="max-h-80 w-full rounded-[12px] object-cover"
              />
              {modeTag && <span className={`text-xs ${metaColor}`}>{modeTag}</span>}
            </div>
          )}
          {photo.kind === "once-available" && (
            <button
              type="button"
              onClick={revelar}
              disabled={revelando}
              className="rounded-[12px] border border-dashed border-line px-4 py-6 text-sm text-foreground hover:border-accent disabled:opacity-50"
            >
              {revelando ? "Abrindo…" : "📷 Ver foto · visualização única"}
            </button>
          )}
          {photo.kind === "once-gone" && (
            <span className={`text-sm italic ${metaColor}`}>
              📷 Visualização única — já aberta
            </span>
          )}
          {photo.kind === "expired" && (
            <span className={`text-sm italic ${metaColor}`}>📷 Foto expirada</span>
          )}
        </>
      )}

      {revelada && (
        <span className={`text-sm italic ${metaColor}`}>
          📷 Visualização única — já aberta
        </span>
      )}

      {urlRevelada && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
          onClick={() => {
            setUrlRevelada(null);
            setRevelada(true);
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={urlRevelada}
            alt=""
            className="max-h-full max-w-full rounded-[12px] object-contain"
          />
          <span className="absolute bottom-6 text-xs text-white/70">
            Toque para fechar — esta foto não abre de novo
          </span>
        </div>
      )}

      {message.content && <span>{message.content}</span>}
      <span className={`flex items-center gap-2 text-xs font-normal ${metaColor}`}>
        {formatarDataHora(message.sent_at)}
        {message.edited_at && <span>· editada</span>}
        {isMine && (
          <>
            <button
              type="button"
              onClick={() => setEditing(true)}
              className={`${metaColor} hover:underline`}
            >
              Editar
            </button>
            <form action={deleteMessage} className="inline">
              <input type="hidden" name="conversation_id" value={conversationId} />
              <input type="hidden" name="message_id" value={message.id} />
              <button type="submit" className={`${metaColor} hover:underline`}>
                Excluir
              </button>
            </form>
          </>
        )}
      </span>
    </li>
  );
}
