"use client";

import { useState } from "react";

// Comprime/redimensiona a imagem no proprio navegador antes de enviar. Fotos
// de celular chegam com vários MB e estouram o limite de corpo das server
// actions do Next (~1MB) -- aqui a gente reduz pra caber com folga, tentando
// dimensoes/qualidade progressivamente menores ate ficar abaixo de ~900KB.
const TARGET_BYTES = 900 * 1024;
const ATTEMPTS: [number, number][] = [
  [1600, 0.82],
  [1280, 0.8],
  [1024, 0.75],
  [800, 0.7],
];

function baseName(name: string): string {
  return name.replace(/\.[^./\\]+$/, "") || "foto";
}

async function compressImage(file: File): Promise<File> {
  if (!file.type.startsWith("image/")) return file;
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();

    let last: Blob | null = null;
    for (const [maxDim, quality] of ATTEMPTS) {
      const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
      const w = Math.max(1, Math.round(img.width * scale));
      const h = Math.max(1, Math.round(img.height * scale));
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) return file;
      ctx.drawImage(img, 0, 0, w, h);
      const blob: Blob | null = await new Promise((res) =>
        canvas.toBlob(res, "image/jpeg", quality),
      );
      if (!blob) continue;
      last = blob;
      if (blob.size <= TARGET_BYTES) break;
    }
    if (!last) return file;
    return new File([last], `${baseName(file.name)}.jpg`, { type: "image/jpeg" });
  } catch {
    return file; // se algo falhar, envia o original
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function ImageUploadForm({
  action,
  fieldName,
  label,
  hidden = {},
}: {
  action: (formData: FormData) => Promise<void>;
  fieldName: string;
  label: string;
  hidden?: Record<string, string>;
}) {
  const [busy, setBusy] = useState(false);

  async function handle(formData: FormData) {
    const file = formData.get(fieldName);
    if (file instanceof File && file.size > 0) {
      setBusy(true);
      try {
        const optimized = await compressImage(file);
        formData.set(fieldName, optimized, optimized.name);
      } catch {
        // segue com o arquivo original
      }
    }
    await action(formData);
    setBusy(false);
  }

  return (
    <form action={handle} className="mt-3 flex flex-wrap items-center gap-2">
      {Object.entries(hidden).map(([k, v]) => (
        <input key={k} type="hidden" name={k} value={v} />
      ))}
      <input
        type="file"
        name={fieldName}
        accept="image/*"
        required
        disabled={busy}
        className="min-w-0 max-w-full text-sm"
      />
      <button type="submit" disabled={busy} className="btn-secondary shrink-0">
        {busy ? "Enviando…" : label}
      </button>
    </form>
  );
}
