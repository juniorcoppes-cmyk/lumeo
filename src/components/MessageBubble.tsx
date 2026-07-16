"use client";

import { useState } from "react";
import { deleteMessage, editMessage } from "@/app/(logged)/chat/[id]/actions";
import { formatarDataHora } from "@/lib/datas";

export type ChatMessage = {
  id: string;
  content: string;
  sent_at: string;
  edited_at: string | null;
  deleted_at: string | null;
};

export function MessageBubble({
  message,
  conversationId,
  isMine,
  unread,
}: {
  message: ChatMessage;
  conversationId: string;
  isMine: boolean;
  /** Recibo de leitura: mensagem MINHA que o destinatário ainda não leu. */
  unread: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const deleted = !!message.deleted_at;

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

  return (
    <li className={`${base} ${side} ${unread ? "font-bold" : "font-normal"}`}>
      <span>{message.content}</span>
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
