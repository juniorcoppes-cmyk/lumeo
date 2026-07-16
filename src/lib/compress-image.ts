// Comprime/redimensiona uma imagem no próprio navegador antes de enviar. Fotos
// de celular chegam com vários MB e estouram o limite de corpo das server
// actions do Next — aqui a gente reduz pra caber com folga, tentando
// dimensões/qualidade progressivamente menores até ficar abaixo de ~900KB.
// Só roda no cliente (usa Image/canvas); importar só de componentes "use client".
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

export async function compressImage(file: File): Promise<File> {
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
