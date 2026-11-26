"use client";

import { useEffect, useRef, useState } from "react";
import { PhotoEditor } from "./PhotoEditor";

// STORIES — a fileira de bolinhas no alto do feed e o visualizador em tela
// cheia. Publicação que vive 24 horas.
//
// A regra do rosto é a mesma do feed: a foto passa pelo editor, o borrão é
// queimado no navegador, e sem nenhuma marca a pessoa precisa confirmar que
// não há rosto ali. Story é o lugar onde se posta rápido, sem pensar muito —
// justamente por isso o freio não pode faltar aqui.

export type Story = {
  id: string;
  user_id: string;
  author_name: string;
  photo_path: string;
  caption: string | null;
  created_at: string;
  url?: string;
  avatarUrl?: string;
};

type Grupo = { user_id: string; nome: string; avatarUrl?: string; itens: Story[] };

/// Quanto tempo cada story fica na tela antes de passar pro próximo.
const DURACAO_MS = 5000;

function agrupar(stories: Story[]): Grupo[] {
  const mapa = new Map<string, Grupo>();
  for (const s of stories) {
    const g = mapa.get(s.user_id);
    if (g) g.itens.push(s);
    else
      mapa.set(s.user_id, {
        user_id: s.user_id,
        nome: s.author_name,
        avatarUrl: s.avatarUrl,
        itens: [s],
      });
  }
  return [...mapa.values()];
}

function haQuantoTempo(iso: string): string {
  const min = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (min < 1) return "agora";
  if (min < 60) return `há ${min} min`;
  return `há ${Math.floor(min / 60)} h`;
}

export function Stories({
  stories,
  meuId,
  publicar,
  apagar,
}: {
  stories: Story[];
  meuId: string;
  publicar: (formData: FormData) => void | Promise<void>;
  apagar: (formData: FormData) => void | Promise<void>;
}) {
  const grupos = agrupar(stories);
  // O meu vem primeiro: é o único que eu posso apagar, e é o que eu quero
  // conferir depois de postar.
  grupos.sort((a, b) => Number(b.user_id === meuId) - Number(a.user_id === meuId));

  const inputRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const [editando, setEditando] = useState<File | null>(null);
  const [pendente, setPendente] = useState<{ file: File; borroes: number } | null>(null);
  const [semRosto, setSemRosto] = useState(false);
  const [aberto, setAberto] = useState<{ g: number; i: number } | null>(null);

  const meuGrupo = grupos.find((g) => g.user_id === meuId);

  function escolher(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f || !f.type.startsWith("image/")) return;
    setEditando(f);
  }

  function aplicar(arquivo: File, borroes: number) {
    setEditando(null);
    setSemRosto(false);
    if (borroes > 0) {
      enviar(arquivo);
      return;
    }
    // Sem borrão: segura e pergunta antes de publicar.
    setPendente({ file: arquivo, borroes });
  }

  function enviar(arquivo: File) {
    const dt = new DataTransfer();
    dt.items.add(arquivo);
    if (inputRef.current) inputRef.current.files = dt.files;
    setPendente(null);
    formRef.current?.requestSubmit();
  }

  return (
    <>
      <form ref={formRef} action={publicar} className="hidden">
        <input ref={inputRef} type="file" name="photo" accept="image/*" onChange={escolher} />
      </form>

      <div className="-mx-6 overflow-x-auto px-6">
        <ul className="flex items-start gap-4">
          {/* Meu botão de publicar, sempre primeiro. */}
          <li className="flex w-16 shrink-0 flex-col items-center gap-1">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="relative h-16 w-16 rounded-full border-2 border-dashed border-line text-2xl text-muted hover:border-accent hover:text-accent"
              aria-label="Publicar um story"
            >
              +
            </button>
            <span className="truncate text-center text-xs text-muted">Seu story</span>
          </li>

          {grupos.map((g, gi) => (
            <li key={g.user_id} className="flex w-16 shrink-0 flex-col items-center gap-1">
              <button
                type="button"
                onClick={() => setAberto({ g: gi, i: 0 })}
                className="h-16 w-16 rounded-full p-[2px] ring-2 ring-accent"
              >
                {g.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={g.avatarUrl} alt="" className="h-full w-full rounded-full object-cover" />
                ) : (
                  <span className="flex h-full w-full items-center justify-center rounded-full bg-accent-soft text-xs text-muted">
                    {g.nome.slice(0, 2)}
                  </span>
                )}
              </button>
              <span className="w-16 truncate text-center text-xs text-muted">
                {g.user_id === meuId ? "Você" : g.nome.split(" ")[0]}
              </span>
            </li>
          ))}
        </ul>
      </div>

      {/* Pergunta do rosto, quando a pessoa não marcou nada no editor. */}
      {pendente && (
        <div className="mt-3 rounded-xl border border-on-accent-soft/40 bg-on-accent-soft/10 p-3 text-sm">
          <p className="text-foreground">
            Você não marcou nenhum rosto. No Secret, rosto vai sempre borrado.
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => {
                setEditando(pendente.file);
                setPendente(null);
              }}
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
            <button
              type="button"
              disabled={!semRosto}
              onClick={() => enviar(pendente.file)}
              className="btn-primary text-sm disabled:opacity-50"
            >
              Publicar
            </button>
            <button
              type="button"
              onClick={() => setPendente(null)}
              className="text-sm text-muted hover:underline"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {editando && (
        <PhotoEditor
          file={editando}
          aspect={9 / 16}
          onConfirm={aplicar}
          onCancel={() => {
            setEditando(null);
            if (inputRef.current) inputRef.current.value = "";
          }}
        />
      )}

      {aberto && (
        <Visualizador
          grupos={grupos}
          posicao={aberto}
          meuId={meuId}
          apagar={apagar}
          onFechar={() => setAberto(null)}
          onMover={setAberto}
        />
      )}
    </>
  );
}

function Visualizador({
  grupos,
  posicao,
  meuId,
  apagar,
  onFechar,
  onMover,
}: {
  grupos: Grupo[];
  posicao: { g: number; i: number };
  meuId: string;
  apagar: (formData: FormData) => void | Promise<void>;
  onFechar: () => void;
  onMover: (p: { g: number; i: number }) => void;
}) {
  const grupo = grupos[posicao.g];
  const story = grupo?.itens[posicao.i];

  // Avança sozinho, como no Instagram. O timer reinicia a cada story — a
  // dependência em posicao é o que faz isso acontecer.
  useEffect(() => {
    const t = setTimeout(avancar, DURACAO_MS);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [posicao.g, posicao.i]);

  function avancar() {
    if (!grupo) return onFechar();
    if (posicao.i + 1 < grupo.itens.length) return onMover({ g: posicao.g, i: posicao.i + 1 });
    if (posicao.g + 1 < grupos.length) return onMover({ g: posicao.g + 1, i: 0 });
    onFechar();
  }

  function voltar() {
    if (posicao.i > 0) return onMover({ g: posicao.g, i: posicao.i - 1 });
    if (posicao.g > 0)
      return onMover({ g: posicao.g - 1, i: grupos[posicao.g - 1].itens.length - 1 });
  }

  if (!story) return null;

  return (
    <div className="fixed inset-0 z-50 flex h-[100dvh] flex-col bg-black">
      <div className="flex items-center gap-2 px-4 pb-2 pt-[max(0.75rem,env(safe-area-inset-top))]">
        {grupo.itens.map((_, i) => (
          <span
            key={i}
            className={`h-0.5 flex-1 rounded-full ${i <= posicao.i ? "bg-white" : "bg-white/30"}`}
          />
        ))}
      </div>

      <div className="flex items-center justify-between gap-3 px-4 pb-2 text-sm text-white">
        <span className="truncate">
          {grupo.user_id === meuId ? "Você" : grupo.nome}
          <span className="ml-2 text-white/60">{haQuantoTempo(story.created_at)}</span>
        </span>
        <button type="button" onClick={onFechar} className="text-white/80" aria-label="Fechar">
          ✕
        </button>
      </div>

      <div className="relative flex-1 overflow-hidden">
        {story.url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={story.url} alt="" className="h-full w-full object-contain" />
        )}
        {/* Metade esquerda volta, metade direita avança — o gesto que todo
            mundo já conhece de outros apps. */}
        <button
          type="button"
          onClick={voltar}
          className="absolute inset-y-0 left-0 w-1/3"
          aria-label="Anterior"
        />
        <button
          type="button"
          onClick={avancar}
          className="absolute inset-y-0 right-0 w-2/3"
          aria-label="Próximo"
        />
      </div>

      <div className="px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 text-sm text-white">
        {story.caption && <p>{story.caption}</p>}
        {grupo.user_id === meuId && (
          <form action={apagar} className="mt-2">
            <input type="hidden" name="story_id" value={story.id} />
            <button type="submit" className="text-xs text-red-400">
              Apagar este story
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
