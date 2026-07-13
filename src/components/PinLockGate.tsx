"use client";

import { useEffect, useState } from "react";
import {
  checkPin,
  hasPinConfigured,
  isStandalonePwa,
  isUnlockedThisSession,
  markUnlockedThisSession,
} from "@/lib/pin-lock";

export function PinLockGate({ children }: { children: React.ReactNode }) {
  const [locked, setLocked] = useState(false);
  const [ready, setReady] = useState(false);
  const [pin, setPinValue] = useState("");
  const [error, setError] = useState(false);

  useEffect(() => {
    const shouldLock = isStandalonePwa() && hasPinConfigured() && !isUnlockedThisSession();
    setLocked(shouldLock);
    setReady(true);
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (await checkPin(pin)) {
      markUnlockedThisSession();
      setLocked(false);
      setError(false);
    } else {
      setError(true);
      setPinValue("");
    }
  }

  if (!ready) return null;

  if (!locked) return <>{children}</>;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-black px-6 text-white">
      <span className="text-4xl font-bold">L</span>
      <p className="text-sm text-neutral-300">Digite seu PIN de acesso rápido</p>
      <form onSubmit={handleSubmit} className="flex flex-col items-center gap-3">
        <input
          type="password"
          inputMode="numeric"
          pattern="\d{4}"
          maxLength={4}
          autoFocus
          value={pin}
          onChange={(e) => {
            setPinValue(e.target.value.replace(/\D/g, "").slice(0, 4));
            setError(false);
          }}
          className="w-32 rounded border border-neutral-700 bg-black px-3 py-2 text-center text-2xl tracking-[0.5em] text-white"
        />
        {error && <p className="text-sm text-red-400">PIN incorreto</p>}
        <button
          type="submit"
          disabled={pin.length !== 4}
          className="rounded bg-white px-4 py-2 text-sm font-medium text-black disabled:opacity-40"
        >
          Entrar
        </button>
      </form>
    </div>
  );
}
