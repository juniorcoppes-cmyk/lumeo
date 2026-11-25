"use client";

import { useState } from "react";
import { INTERESTS, PACE, SETTINGS, type Affinity } from "@/lib/affinity";
import { salvarAfinidade } from "@/app/(logged)/perfil/afinidade/actions";

function CheckGroup({
  name,
  options,
  selected,
}: {
  name: string;
  options: Record<string, string>;
  selected: string[];
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {Object.entries(options).map(([key, label]) => {
        const id = `${name}-${key}`;
        return (
          <label
            key={key}
            htmlFor={id}
            className="cursor-pointer rounded-full border border-line px-3 py-1.5 text-sm text-foreground has-[:checked]:border-accent has-[:checked]:bg-accent-soft has-[:checked]:text-on-accent-soft"
          >
            <input
              id={id}
              type="checkbox"
              name={name}
              value={key}
              defaultChecked={selected.includes(key)}
              className="sr-only"
            />
            {label}
          </label>
        );
      })}
    </div>
  );
}

export function AfinidadeForm({ current }: { current: Affinity }) {
  const [busy, setBusy] = useState(false);

  async function handle(formData: FormData) {
    if (busy) return;
    setBusy(true);
    try {
      await salvarAfinidade(formData);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form action={handle} className="mt-6 flex flex-col gap-8">
      <section>
        <h2 className="text-lg">Interesses e vibe</h2>
        <p className="mb-3 mt-1 text-sm text-muted">
          O quebra-gelo — o que vocês curtem fora da cama.
        </p>
        <CheckGroup name="interests" options={INTERESTS} selected={current.interests} />
      </section>

      <section>
        <h2 className="text-lg">Ritmo de vocês</h2>
        <div className="mt-3 flex flex-col gap-2">
          {Object.entries(PACE).map(([key, label]) => (
            <label key={key} className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="pace"
                value={key}
                defaultChecked={current.pace === key}
              />
              {label}
            </label>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-lg">Onde vocês se sentem à vontade</h2>
        <p className="mb-3 mt-1 text-sm text-muted">Pode marcar mais de um.</p>
        <CheckGroup name="settings" options={SETTINGS} selected={current.settings} />
      </section>

      <button type="submit" disabled={busy} className="btn-primary self-start">
        {busy ? "Salvando…" : "Salvar afinidade"}
      </button>
    </form>
  );
}
