"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Cropper, { type Area } from "react-easy-crop";

// Retângulo de borrão, em pixels da imagem JÁ cortada.
type Rect = { x: number; y: number; w: number; h: number };

const PRESETS: { label: string; value: number }[] = [
  { label: "3:4", value: 3 / 4 },
  { label: "1:1", value: 1 },
  { label: "4:3", value: 4 / 3 },
  { label: "9:16", value: 9 / 16 },
];

async function loadImage(url: string): Promise<HTMLImageElement> {
  const img = new Image();
  img.src = url;
  await img.decode();
  return img;
}

/** Recorta a área escolhida e devolve uma URL da imagem cortada. */
async function cropToUrl(imageUrl: string, area: Area): Promise<string> {
  const img = await loadImage(imageUrl);
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(area.width));
  canvas.height = Math.max(1, Math.round(area.height));
  const ctx = canvas.getContext("2d");
  if (!ctx) return imageUrl;
  ctx.drawImage(
    img,
    area.x, area.y, area.width, area.height,
    0, 0, canvas.width, canvas.height,
  );
  const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", 0.92));
  return blob ? URL.createObjectURL(blob) : imageUrl;
}

/**
 * Aplica o borrão nos retângulos marcados e devolve o arquivo final. O borrão
 * é "queimado" na imagem aqui, no navegador — o que sobe já vai borrado, então
 * não existe original sem borrão em lugar nenhum do servidor.
 */
async function burnBlurs(croppedUrl: string, rects: Rect[], fileName: string): Promise<File> {
  const img = await loadImage(croppedUrl);
  const canvas = document.createElement("canvas");
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(img, 0, 0);

  for (const r of rects) {
    // Raio proporcional ao tamanho da área, com piso — borrão fraco demais
    // em área grande não esconde nada.
    const radius = Math.max(12, Math.min(r.w, r.h) / 4);
    ctx.save();
    ctx.beginPath();
    ctx.rect(r.x, r.y, r.w, r.h);
    ctx.clip();
    ctx.filter = `blur(${radius}px)`;
    ctx.drawImage(img, 0, 0); // redesenha borrado, recortado no retângulo
    ctx.restore();
  }

  const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", 0.92));
  const base = fileName.replace(/\.[^./\\]+$/, "") || "foto";
  return new File([blob!], `${base}.jpg`, { type: "image/jpeg" });
}

export function PhotoEditor({
  file,
  aspect,
  onConfirm,
  onCancel,
}: {
  file: File;
  /** Proporção travada (ex.: 1 pro avatar, 9/16 pro story). Sem isso, a pessoa escolhe. */
  aspect?: number;
  onConfirm: (edited: File) => void;
  onCancel: () => void;
}) {
  const [srcUrl] = useState(() => URL.createObjectURL(file));
  const [step, setStep] = useState<"crop" | "blur">("crop");
  const [ratio, setRatio] = useState(aspect ?? 3 / 4);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [area, setArea] = useState<Area | null>(null);
  const [croppedUrl, setCroppedUrl] = useState<string | null>(null);
  const [rects, setRects] = useState<Rect[]>([]);
  const [drawing, setDrawing] = useState<Rect | null>(null);
  const [busy, setBusy] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  // Ponto onde o dedo encostou. Precisa ficar fora do state do retângulo: o
  // retângulo é normalizado (vira min/abs) a cada movimento, então ele mesmo
  // não serve de âncora — senão arrastar pra cima/esquerda dá caixa errada.
  const anchorRef = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    return () => {
      URL.revokeObjectURL(srcUrl);
      if (croppedUrl) URL.revokeObjectURL(croppedUrl);
    };
  }, [srcUrl, croppedUrl]);

  const onCropComplete = useCallback((_: Area, px: Area) => setArea(px), []);

  async function goToBlur() {
    if (!area) return;
    setBusy(true);
    setCroppedUrl(await cropToUrl(srcUrl, area));
    setStep("blur");
    setBusy(false);
  }

  async function confirm() {
    if (!croppedUrl) return;
    setBusy(true);
    onConfirm(await burnBlurs(croppedUrl, rects, file.name));
  }

  // Converte coordenada do dedo/mouse pra pixel da imagem cortada.
  function toImageCoords(e: React.PointerEvent) {
    const el = imgRef.current!;
    const box = el.getBoundingClientRect();
    const scale = el.naturalWidth / box.width;
    return {
      x: (e.clientX - box.left) * scale,
      y: (e.clientY - box.top) * scale,
    };
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black/95">
      <div className="flex items-center justify-between gap-3 p-4 text-sm">
        <button type="button" onClick={onCancel} className="text-muted">
          Cancelar
        </button>
        <span className="font-medium text-white">
          {step === "crop" ? "Enquadre a foto" : "Marque o que quer borrar"}
        </span>
        <button
          type="button"
          disabled={busy || (step === "crop" && !area)}
          onClick={step === "crop" ? goToBlur : confirm}
          className="font-medium text-accent disabled:opacity-40"
        >
          {busy ? "…" : step === "crop" ? "Avançar" : "Confirmar"}
        </button>
      </div>

      <div className="relative flex-1 overflow-hidden">
        {step === "crop" ? (
          <Cropper
            image={srcUrl}
            crop={crop}
            zoom={zoom}
            aspect={ratio}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropComplete}
          />
        ) : (
          <div className="flex h-full items-center justify-center p-3">
            <div className="relative touch-none">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                ref={imgRef}
                src={croppedUrl!}
                alt=""
                className="max-h-[60vh] w-auto select-none"
                draggable={false}
                onPointerDown={(e) => {
                  (e.target as HTMLElement).setPointerCapture(e.pointerId);
                  const p = toImageCoords(e);
                  anchorRef.current = p;
                  setDrawing({ x: p.x, y: p.y, w: 0, h: 0 });
                }}
                onPointerMove={(e) => {
                  const a = anchorRef.current;
                  if (!a) return;
                  const p = toImageCoords(e);
                  setDrawing({
                    x: Math.min(a.x, p.x),
                    y: Math.min(a.y, p.y),
                    w: Math.abs(p.x - a.x),
                    h: Math.abs(p.y - a.y),
                  });
                }}
                onPointerUp={() => {
                  anchorRef.current = null;
                  if (drawing && drawing.w > 8 && drawing.h > 8) setRects((r) => [...r, drawing]);
                  setDrawing(null);
                }}
                onPointerCancel={() => {
                  anchorRef.current = null;
                  setDrawing(null);
                }}
              />
              {[...rects, ...(drawing ? [drawing] : [])].map((r, i) => {
                const el = imgRef.current;
                const s = el ? el.getBoundingClientRect().width / el.naturalWidth : 1;
                return (
                  <div
                    key={i}
                    className="pointer-events-none absolute border border-accent/70 bg-black/10 backdrop-blur-md"
                    style={{ left: r.x * s, top: r.y * s, width: r.w * s, height: r.h * s }}
                  />
                );
              })}
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-center gap-2 p-4 text-xs">
        {step === "crop" ? (
          <>
            {!aspect &&
              PRESETS.map((p) => (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => setRatio(p.value)}
                  className={`rounded-full border px-3 py-1.5 ${
                    ratio === p.value ? "border-accent text-accent" : "border-line text-muted"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            <span className="w-full text-center text-muted">Arraste e use dois dedos pra dar zoom.</span>
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={() => setRects((r) => r.slice(0, -1))}
              disabled={rects.length === 0}
              className="rounded-full border border-line px-3 py-1.5 text-muted disabled:opacity-40"
            >
              Desfazer
            </button>
            <button
              type="button"
              onClick={() => setRects([])}
              disabled={rects.length === 0}
              className="rounded-full border border-line px-3 py-1.5 text-muted disabled:opacity-40"
            >
              Limpar
            </button>
            <span className="w-full text-center text-muted">
              Arraste sobre o que quer esconder. Pode marcar vários. Se não quiser borrar nada, é só
              confirmar.
            </span>
          </>
        )}
      </div>
    </div>
  );
}
