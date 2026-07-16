"use client";

import { compressImage } from "@/lib/compress-image";

// Envolve um <form> normal e, no submit, comprime no navegador os campos de
// imagem indicados (imageFields) antes de chamar a server action — os demais
// campos passam intactos. Serve pra formulários com vários campos + upload
// (ex.: criar/editar evento), onde o ImageUploadForm (1 arquivo só) não encaixa.
export function CompressingForm({
  action,
  imageFields,
  className,
  children,
}: {
  action: (formData: FormData) => Promise<void>;
  imageFields: string[];
  className?: string;
  children: React.ReactNode;
}) {
  async function handle(formData: FormData) {
    for (const field of imageFields) {
      const f = formData.get(field);
      if (f instanceof File && f.size > 0 && f.type.startsWith("image/")) {
        try {
          const optimized = await compressImage(f);
          formData.set(field, optimized, optimized.name);
        } catch {
          // segue com o arquivo original
        }
      }
    }
    await action(formData);
  }

  return (
    <form action={handle} className={className}>
      {children}
    </form>
  );
}
