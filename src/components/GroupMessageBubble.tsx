"use client";

import { useState } from "react";
import Link from "next/link";
import { editarMensagemGrupo, excluirMensagemGrupo } from "@/app/(logged)/eventos/[id]/grupo/actions";
import { formatarDataHora } from "@/lib/datas";

export type GroupMessage = {
  id: string;
  sender_id: string;
  sender_name: string;
  sender_persona: string | null;
  sender_gender: string | null;
  sender_partner_gender: string | null;
  content: string;
  created_at: string;
  edited_at: string | null;
  deleted_at: string | null;
  photo_path: string | null;
  photo_mode: "fixa" | "temporaria" | null;
  photo_expires_at: string | null;
};

// Como a foto desta mensagem deve aparecer, já resolvido no servidor.
//  - "image":   mostra a foto (url pronta). Modo dá o rótulo.
//  - "expired": temporária que passou das 24h.
export type GroupPhoto = {
  kind: "image" | "expired";
  url?: string | null;
  mode?: "fixa" | "temporaria" | null;
};

export function GroupMessageBubble({
  message,
  eventId,
  isMine,
  personaLabel,
  photo,
}: {
  message: GroupMessage;
  eventId: string;
  isMine: boolean;
  /** "Quem falou" num perfil de casal (Ele/Ela/Pessoa 1/2). Null = individual. */
  personaLabel?: string | null;
  /** Foto da mensagem, já resolvida no servidor. Null = mensagem só de texto. */
  photo?: GroupPhoto | null;
}) {
  const [editing, setEditing] = useState(false);
  const deleted = !!message.deleted_at;

  const base = "flex max-w-[75%] flex-col gap-1 rounded-[18px] px-3 py-2 text-sm";
  const side = isMine
    ? "self-end bg-accent text-on-accent"
    : "self-start border border-line bg-surface text-foreground";
  const metaColor = isMine ? "text-on-accent/70" : "text-muted";

  if (deleted) {
    return (
      <li
        className={`${base} ${
          isMine ? "self-end" : "self-start"
        } border border-line bg-surface/50 italic text-muted`}
      >
        <span>Mensagem apagada</span>
        <span className="text-xs not-italic text-muted">
          {formatarDataHora(message.created_at)}
        </span>
      </li>
    );
  }

  if (editing) {
    return (
      <li className={`${base} ${side}`}>
        <form
          action={editarMensagemGrupo}
          onSubmit={() => setEditing(false)}
          className="flex flex-col gap-2"
        >
          <input type="hidden" name="event_id" value={eventId} />
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

  const modeTag = photo?.kind === "image" && photo.mode === "temporaria" ? "some em 24h" : null;

  return (
    <li className={`${base} ${side}`}>
      {/* Num grupo, cada mensagem precisa dizer de quem é. Minha mensagem não
          repete meu nome; a dos outros mostra e leva pro perfil. O rótulo de
          casal (Ele/Ela) acompanha o nome. */}
      {!isMine && (
        <span className="flex items-center gap-1 text-xs">
          <Link
            href={`/perfil/${message.sender_id}`}
            className="font-medium text-accent no-underline hover:underline"
          >
            {message.sender_name}
          </Link>
          {personaLabel && <span className="text-muted">· {personaLabel}</span>}
        </span>
      )}
      {isMine && personaLabel && (
        <span className={`text-xs font-semibold ${metaColor}`}>{personaLabel}</span>
      )}

      {photo && (
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
          {photo.kind === "expired" && (
            <span className={`text-sm italic ${metaColor}`}>📷 Foto expirada</span>
          )}
        </>
      )}

      {message.content && <span>{message.content}</span>}
      <span className={`flex items-center gap-2 text-xs font-normal ${metaColor}`}>
        {formatarDataHora(message.created_at)}
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
            <form action={excluirMensagemGrupo} className="inline">
              <input type="hidden" name="event_id" value={eventId} />
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
