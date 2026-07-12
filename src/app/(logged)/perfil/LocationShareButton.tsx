"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateLocation } from "./actions";

export function LocationShareButton() {
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const router = useRouter();

  function handleClick() {
    setStatus("loading");
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        await updateLocation(position.coords.latitude, position.coords.longitude);
        setStatus("done");
        router.refresh();
      },
      () => setStatus("error"),
      { enableHighAccuracy: false, timeout: 10000 },
    );
  }

  return (
    <span className="flex items-center gap-2">
      <button
        type="button"
        onClick={handleClick}
        className="rounded border px-3 py-1 text-sm"
      >
        Compartilhar minha localização
      </button>
      {status === "loading" && (
        <span className="text-xs text-neutral-500">Obtendo localização…</span>
      )}
      {status === "done" && (
        <span className="text-xs text-green-700">Localização atualizada.</span>
      )}
      {status === "error" && (
        <span className="text-xs text-red-600">Não foi possível obter sua localização.</span>
      )}
    </span>
  );
}
