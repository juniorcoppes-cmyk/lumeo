"use client";

import { useState } from "react";

// Curtida e comentários embaixo de cada post do feed.
//
// Os comentários abrem fechados, atrás de "ver os N comentários": o feed é
// pra passar o olho, e uma lista de conversa aberta em todo post faz a
// pessoa rolar muito pra ver pouco.
//
// A RESPOSTA é conversa de duas pessoas — quem comentou e o dono do post. O
// botão "Responder" só aparece pra quem pode, e o banco recusa quem tentar
// pelo formulário na mão. Foto de alguém não é palco de discussão entre
// estranhos; isso é o que afasta justamente o público daqui.

export type Comentario = {
  id: string;
  author_id: string;
  author_name: string;
  content: string;
  reply_to: string | null;
  created_at: string;
};

function quandoFoi(iso: string): string {
  const min = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (min < 1) return "agora";
  if (min < 60) return `há ${min} min`;
  if (min < 1440) return `há ${Math.floor(min / 60)} h`;
  return `há ${Math.floor(min / 1440)} d`;
}

export function InteracoesDoPost({
  postId,
  donoDoPostId,
  meuId,
  curtidas,
  curtiEu,
  comentarios,
  curtir,
  comentar,
  apagar,
}: {
  postId: string;
  donoDoPostId: string;
  meuId: string;
  curtidas: number;
  curtiEu: boolean;
  comentarios: Comentario[];
  curtir: (formData: FormData) => void | Promise<void>;
  comentar: (formData: FormData) => void | Promise<void>;
  apagar: (formData: FormData) => void | Promise<void>;
}) {
  const [abertos, setAbertos] = useState(false);
  const [respondendo, setRespondendo] = useState<string | null>(null);

  const primeiroNivel = comentarios.filter((c) => !c.reply_to);
  const respostasDe = (id: string) => comentarios.filter((c) => c.reply_to === id);
  const souDono = donoDoPostId === meuId;

  return (
    <div className="mt-3 border-t border-line pt-3">
      <div className="flex flex-wrap items-center gap-4 text-sm">
        <form action={curtir}>
          <input type="hidden" name="post_id" value={postId} />
          <button
            type="submit"
            className={`flex items-center gap-1.5 ${
              curtiEu ? "text-accent" : "text-muted hover:text-foreground"
            }`}
            aria-pressed={curtiEu}
          >
            <span aria-hidden>{curtiEu ? "♥" : "♡"}</span>
            {curtidas > 0 ? curtidas : "Curtir"}
          </button>
        </form>

        <button
          type="button"
          onClick={() => setAbertos((v) => !v)}
          className="text-muted hover:text-foreground"
        >
          {comentarios.length === 0
            ? "Comentar"
            : abertos
              ? "esconder comentários"
              : `ver ${comentarios.length} ${comentarios.length === 1 ? "comentário" : "comentários"}`}
        </button>
      </div>

      {abertos && (
        <div className="mt-3 flex flex-col gap-3">
          {primeiroNivel.map((c) => {
            const podeResponder = souDono || c.author_id === meuId;
            return (
              <div key={c.id} className="text-sm">
                <Linha c={c} meuId={meuId} souDono={souDono} apagar={apagar} />

                {respostasDe(c.id).map((r) => (
                  <div key={r.id} className="mt-2 border-l border-line pl-3">
                    <Linha c={r} meuId={meuId} souDono={souDono} apagar={apagar} />
                  </div>
                ))}

                {podeResponder &&
                  (respondendo === c.id ? (
                    <form action={comentar} className="mt-2 flex gap-2 border-l border-line pl-3">
                      <input type="hidden" name="post_id" value={postId} />
                      <input type="hidden" name="reply_to" value={c.id} />
                      <input
                        name="content"
                        autoFocus
                        maxLength={1000}
                        placeholder="Responder…"
                        className="input flex-1 !py-1 text-sm"
                      />
                      <button type="submit" className="btn-secondary !px-3 !py-1 !text-xs">
                        Enviar
                      </button>
                    </form>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setRespondendo(c.id)}
                      className="mt-1 ml-3 text-xs text-muted hover:text-foreground"
                    >
                      Responder
                    </button>
                  ))}
              </div>
            );
          })}

          <form action={comentar} className="flex gap-2">
            <input type="hidden" name="post_id" value={postId} />
            <input
              name="content"
              maxLength={1000}
              placeholder="Escreva um comentário"
              className="input flex-1 !py-1 text-sm"
            />
            <button type="submit" className="btn-secondary !px-3 !py-1 !text-xs">
              Enviar
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

function Linha({
  c,
  meuId,
  souDono,
  apagar,
}: {
  c: Comentario;
  meuId: string;
  souDono: boolean;
  apagar: (formData: FormData) => void | Promise<void>;
}) {
  return (
    // div, não p: o botão de apagar é um <form>, e form dentro de p é HTML
    // inválido — o React remonta a árvore e dá erro de hidratação.
    <div className="flex flex-wrap items-baseline gap-x-2">
      <span className="font-medium text-foreground">{c.author_name}</span>
      <span className="text-foreground/90">{c.content}</span>
      <span className="text-xs text-muted">{quandoFoi(c.created_at)}</span>
      {(c.author_id === meuId || souDono) && (
        <form action={apagar}>
          <input type="hidden" name="comment_id" value={c.id} />
          <button type="submit" className="text-xs text-muted hover:text-red-400">
            apagar
          </button>
        </form>
      )}
    </div>
  );
}
