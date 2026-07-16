"use client";

import { useRef, useState } from "react";
import { PhotoEditor } from "./PhotoEditor";

/**
 * Substitui um <input type="file"> comum: ao escolher a foto, abre o editor
 * (cortar + borrar) e devolve o arquivo já editado pro próprio input — então
 * o formulário em volta (e a compressão no submit) seguem funcionando igual.
 */
export function EditableImageInput({
  name,
  aspect,
  required,
  disabled,
  className,
}: {
  name: string;
  /** Proporção travada (ex.: 1 avatar, 9/16 story, 16/9 paisagem). Sem isso, a pessoa escolhe. */
  aspect?: number;
  required?: boolean;
  disabled?: boolean;
  className?: string;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const [editing, setEditing] = useState<File | null>(null);
  const [edited, setEdited] = useState(false);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f || !f.type.startsWith("image/")) return;
    setEdited(false);
    setEditing(f);
  }

  function apply(file: File) {
    // Troca o arquivo do input pelo editado — o form envia este.
    const dt = new DataTransfer();
    dt.items.add(file);
    if (ref.current) ref.current.files = dt.files;
    setEdited(true);
    setEditing(null);
  }

  function cancel() {
    if (ref.current) ref.current.value = ""; // desfaz a seleção
    setEdited(false);
    setEditing(null);
  }

  return (
    <>
      <input
        ref={ref}
        type="file"
        name={name}
        accept="image/*"
        required={required}
        disabled={disabled}
        onChange={handleChange}
        className={className}
      />
      {edited && (
        <span className="text-xs text-green-400">
          Foto editada ✓{" "}
          <button
            type="button"
            onClick={() => ref.current?.click()}
            className="text-muted underline"
          >
            trocar
          </button>
        </span>
      )}
      {editing && (
        <PhotoEditor file={editing} aspect={aspect} onConfirm={apply} onCancel={cancel} />
      )}
    </>
  );
}
