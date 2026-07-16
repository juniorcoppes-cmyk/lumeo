"use client";

import { useState } from "react";
import { compressImage } from "@/lib/compress-image";
import { EditableImageInput } from "@/components/EditableImageInput";

export function ImageUploadForm({
  action,
  fieldName,
  label,
  hidden = {},
  aspect,
}: {
  action: (formData: FormData) => Promise<void>;
  fieldName: string;
  label: string;
  hidden?: Record<string, string>;
  /** Proporção travada no editor (ex.: 1 pro avatar). Sem isso, a pessoa escolhe. */
  aspect?: number;
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
      <EditableImageInput
        name={fieldName}
        aspect={aspect}
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
