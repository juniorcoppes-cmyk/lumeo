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
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-line bg-accent-soft">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          className="h-6 w-6 text-on-accent-soft"
          aria-hidden="true"
        >
          <path
            d="M9 3 3 5v16l6-2 6 2 6-2V3l-6 2-6-2Z"
            strokeLinejoin="round"
          />
          <path d="M9 3v16M15 5v16" strokeLinejoin="round" />
          <circle cx="12" cy="10" r="2.2" />
        </svg>
      </span>
      <button
        type="button"
        onClick={handleClick}
        className="btn-secondary"
      >
        Compartilhar minha localização
      </button>
      {status === "loading" && (
        <span className="text-xs text-muted">Obtendo localização…</span>
      )}
      {status === "done" && (
        <span className="text-xs text-green-400">Localização atualizada.</span>
      )}
      {status === "error" && (
        <span className="text-xs text-red-400">Não foi possível obter sua localização.</span>
      )}
    </span>
  );
}
