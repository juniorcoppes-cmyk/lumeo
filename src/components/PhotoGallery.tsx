"use client";

import { useEffect, useState } from "react";
import { addPhotoComment, deletePhotoComment } from "@/lib/photo-comments-actions";

type Photo = { id: string; url?: string; storage_path?: string };
type Comment = {
  id: string;
  author_id: string;
  author_name: string;
  content: string;
  created_at: string;
};

export function PhotoGallery({
  photos,
  commentsByPhoto,
  currentUserId,
  photoOwnerId,
  revalidatePath,
  deletePhotoAction,
}: {
  photos: Photo[];
  commentsByPhoto: Record<string, Comment[]>;
  currentUserId: string;
  photoOwnerId: string;
  revalidatePath: string;
  deletePhotoAction?: (formData: FormData) => Promise<void>;
}) {
  const [openId, setOpenId] = useState<string | null>(null);
  const viewablePhotos = photos.filter((p) => p.url);
  const openIndex = viewablePhotos.findIndex((p) => p.id === openId);
  const openPhoto = openIndex >= 0 ? viewablePhotos[openIndex] : undefined;

  function showPrev() {
    if (openIndex > 0) setOpenId(viewablePhotos[openIndex - 1].id);
  }
  function showNext() {
    if (openIndex >= 0 && openIndex < viewablePhotos.length - 1) {
      setOpenId(viewablePhotos[openIndex + 1].id);
    }
  }

  useEffect(() => {
    if (!openPhoto) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "ArrowLeft") showPrev();
      if (e.key === "ArrowRight") showNext();
      if (e.key === "Escape") setOpenId(null);
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openIndex]);

  return (
    <>
      <div className="flex flex-wrap gap-3">
        {photos.map(
          (photo) =>
            photo.url && (
              <div key={photo.id} className="flex flex-col items-center gap-1">
                <button type="button" onClick={() => setOpenId(photo.id)} className="block">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={photo.url}
                    alt=""
                    className="h-24 w-24 rounded object-cover"
                  />
                </button>
                {deletePhotoAction && (
                  <form action={deletePhotoAction}>
                    <input type="hidden" name="photo_id" value={photo.id} />
                    <input type="hidden" name="storage_path" value={photo.storage_path} />
                    <button type="submit" className="text-xs text-red-600 underline">
                      Remover
                    </button>
                  </form>
                )}
              </div>
            ),
        )}
      </div>

      {openPhoto && (
        <div
          className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/90 p-4"
          onClick={() => setOpenId(null)}
        >
          <div
            className="flex max-h-full w-full max-w-2xl flex-col gap-3 overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setOpenId(null)}
              className="self-end rounded bg-white px-3 py-1 text-sm"
            >
              Voltar ao álbum
            </button>
            <div className="relative flex items-center justify-center">
              {openIndex > 0 && (
                <button
                  type="button"
                  onClick={showPrev}
                  aria-label="Foto anterior"
                  className="absolute left-2 z-10 rounded-full bg-white/80 px-3 py-2 text-lg"
                >
                  ‹
                </button>
              )}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={openPhoto.url}
                alt=""
                className="max-h-[70vh] w-full rounded object-contain"
              />
              {openIndex < viewablePhotos.length - 1 && (
                <button
                  type="button"
                  onClick={showNext}
                  aria-label="Próxima foto"
                  className="absolute right-2 z-10 rounded-full bg-white/80 px-3 py-2 text-lg"
                >
                  ›
                </button>
              )}
            </div>

            <div className="rounded bg-white p-4">
              <ul className="flex flex-col gap-2">
                {(commentsByPhoto[openPhoto.id] ?? []).map((c) => (
                  <li key={c.id} className="text-sm">
                    <span className="font-medium">{c.author_name}: </span>
                    <span>{c.content}</span>
                    {(c.author_id === currentUserId || photoOwnerId === currentUserId) && (
                      <form action={deletePhotoComment} className="inline">
                        <input type="hidden" name="comment_id" value={c.id} />
                        <input type="hidden" name="revalidate_path" value={revalidatePath} />
                        <button type="submit" className="ml-2 text-xs text-red-600 underline">
                          Remover
                        </button>
                      </form>
                    )}
                  </li>
                ))}
                {(commentsByPhoto[openPhoto.id] ?? []).length === 0 && (
                  <li className="text-sm text-neutral-500">Nenhum comentário ainda.</li>
                )}
              </ul>
              <form action={addPhotoComment} className="mt-3 flex gap-2">
                <input type="hidden" name="photo_id" value={openPhoto.id} />
                <input type="hidden" name="revalidate_path" value={revalidatePath} />
                <input
                  type="text"
                  name="content"
                  placeholder="Comentar"
                  required
                  className="flex-1 rounded border px-2 py-1 text-sm"
                />
                <button type="submit" className="rounded border px-3 py-1 text-sm">
                  Enviar
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
