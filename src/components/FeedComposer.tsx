"use client";

import { useRef, useState } from "react";
import { PhotoEditor } from "./PhotoEditor";

// O que a pessoa usa pra publicar no feed: texto, foto, ou os dois.
//
// A REGRA DO ROSTO vive aqui. Toda foto passa pelo editor, onde o borrão é
// queimado na imagem dentro do navegador — o arquivo original nunca sai do
// aparelho. Se a pessoa não marcou nenhuma área, o botão de publicar só
// libera depois que ela confirmar que não há rosto na foto. É a diferença
// entre uma regra que protege e uma regra que irrita: ninguém precisa borrar
// um pedaço de uma foto de praia vazia, mas também ninguém publica um rosto
// por distração.
export function FeedComposer({
  action,
}: {
  action: (formData: FormData) => void | Promise<void>;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [editando, setEditando] = useState<File | null>(null);
  const [previa, setPrevia] = useState<string | null>(null);
  const [borroes, setBorroes] = useState(0);
  const [semRosto, setSemRosto] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [texto, setTexto] = useState("");

  const temFoto = previa !== null;
  // Foto sem nenhuma marca de borrão. A caixa de aviso fica na tela enquanto
  // isso for verdade — inclusive depois de a pessoa confirmar que não há
  // rosto. Some a caixa ao marcar, e some junto o jeito de desmarcar.
  const semBorrao = temFoto && borroes === 0;
  const faltaBorrao = semBorrao && !semRosto;
  const podePublicar = (texto.trim().length > 0 || temFoto) && !faltaBorrao && !enviando;

  function escolher(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f || !f.type.startsWith("image/")) return;
    setEditando(f);
  }

  function aplicar(arquivo: File, marcas: number) {
    const dt = new DataTransfer();
    dt.items.add(arquivo);
    if (inputRef.current) inputRef.current.files = dt.files;
    if (previa) URL.revokeObjectURL(previa);
    setPrevia(URL.createObjectURL(arquivo));
    setBorroes(marcas);
    setSemRosto(false);
    setEditando(null);
  }

  function tirarFoto() {
    if (previa) URL.revokeObjectURL(previa);
    if (inputRef.current) inputRef.current.value = "";
    setPrevia(null);
    setBorroes(0);
    setSemRosto(false);
  }

  return (
    <>
      <form
        action={action}
        onSubmit={() => setEnviando(true)}
        className="card flex flex-col gap-3"
      >
        <textarea
          name="content"
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          placeholder="Conte alguma coisa — como foi a noite, o que vocês andam curtindo, uma dúvida pra galera."
          rows={3}
          className="input text-sm"
        />

        <input
          ref={inputRef}
          type="file"
          name="photo"
          accept="image/*"
          onChange={escolher}
          className="hidden"
        />

        {previa && (
          <div className="relative">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={previa}
              alt="Prévia da foto que você vai publicar"
              className="max-h-80 w-full rounded-xl object-contain"
            />
            <button
              type="button"
              onClick={tirarFoto}
              className="absolute right-2 top-2 rounded-full bg-black/70 px-3 py-1 text-xs text-white"
            >
              Trocar
            </button>
          </div>
        )}

        {semBorrao && (
          <div
            className={`rounded-xl border p-3 text-sm ${
              faltaBorrao
                ? "border-on-accent-soft/40 bg-on-accent-soft/10"
                : "border-line bg-surface"
            }`}
          >
            <p className={faltaBorrao ? "text-foreground" : "text-muted"}>
              {faltaBorrao
                ? "No Secret, rosto vai sempre borrado — é o que deixa todo mundo à vontade pra postar."
                : "Beleza: você confirmou que não há rosto nesta foto."}
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                className="btn-secondary text-sm"
              >
                Marcar o rosto
              </button>
              <label className="flex items-center gap-2 text-sm text-muted">
                <input
                  type="checkbox"
                  checked={semRosto}
                  onChange={(e) => setSemRosto(e.target.checked)}
                />
                Não tem rosto nesta foto
              </label>
            </div>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="btn-secondary text-sm"
          >
            {temFoto ? "Trocar foto" : "Adicionar foto"}
          </button>
          <button type="submit" disabled={!podePublicar} className="btn-primary disabled:opacity-50">
            {enviando ? "Publicando…" : "Publicar"}
          </button>
        </div>
      </form>

      {editando && (
        <PhotoEditor
          file={editando}
          onConfirm={aplicar}
          onCancel={() => {
            setEditando(null);
            if (!previa && inputRef.current) inputRef.current.value = "";
          }}
        />
      )}
    </>
  );
}
