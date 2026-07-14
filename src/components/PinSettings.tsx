"use client";

import { useEffect, useState } from "react";
import { clearPin, hasPinConfigured, setPin } from "@/lib/pin-lock";

export function PinSettings() {
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [pin, setPinValue] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    setConfigured(hasPinConfigured());
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (pin.length !== 4) {
      setMessage("O PIN precisa ter 4 dígitos.");
      return;
    }
    if (pin !== confirmPin) {
      setMessage("Os PINs não coincidem.");
      return;
    }
    await setPin(pin);
    setConfigured(true);
    setPinValue("");
    setConfirmPin("");
    setMessage("PIN salvo neste aparelho.");
  }

  function handleRemove() {
    clearPin();
    setConfigured(false);
    setMessage("PIN removido deste aparelho.");
  }

  if (configured === null) return null;

  return (
    <section className="mt-8">
      <h2 className="text-lg">PIN de acesso rápido</h2>
      <p className="mt-1 text-sm text-muted">
        Fica salvo só neste aparelho — pede esse PIN toda vez que você abre o
        Lumeo pelo ícone instalado na tela inicial, antes de mostrar sua
        conta. Não substitui a senha da conta.
      </p>

      {message && <p className="mt-2 text-sm text-muted">{message}</p>}

      {configured ? (
        <button
          onClick={handleRemove}
          className="mt-3 rounded-full border border-red-400 px-3 py-1.5 text-sm text-red-400"
        >
          Remover PIN deste aparelho
        </button>
      ) : (
        <form onSubmit={handleSave} className="mt-3 flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1 text-sm">
            Novo PIN (4 dígitos)
            <input
              type="password"
              inputMode="numeric"
              maxLength={4}
              value={pin}
              onChange={(e) => setPinValue(e.target.value.replace(/\D/g, "").slice(0, 4))}
              className="input w-24 text-center tracking-[0.3em]"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Confirmar PIN
            <input
              type="password"
              inputMode="numeric"
              maxLength={4}
              value={confirmPin}
              onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
              className="input w-24 text-center tracking-[0.3em]"
            />
          </label>
          <button type="submit" className="btn-secondary">
            Salvar PIN
          </button>
        </form>
      )}
    </section>
  );
}
