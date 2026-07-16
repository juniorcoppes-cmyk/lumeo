"use client";

import { useState } from "react";

// Campo de data que insere as barras sozinho conforme a pessoa digita
// (DD/MM/AAAA), sem depender do seletor nativo. Só aceita dígitos; o valor
// enviado no form continua no formato "DD/MM/AAAA" que a action já entende.
function mask(raw: string): string {
  const d = raw.replace(/\D/g, "").slice(0, 8);
  if (d.length > 4) return `${d.slice(0, 2)}/${d.slice(2, 4)}/${d.slice(4)}`;
  if (d.length > 2) return `${d.slice(0, 2)}/${d.slice(2)}`;
  return d;
}

export function BirthDateInput({
  name,
  defaultValue = "",
}: {
  name: string;
  defaultValue?: string;
}) {
  const [value, setValue] = useState(mask(defaultValue));
  return (
    <input
      type="text"
      inputMode="numeric"
      name={name}
      value={value}
      onChange={(e) => setValue(mask(e.target.value))}
      placeholder="DD/MM/AAAA"
      pattern="\d{2}/\d{2}/\d{4}"
      className="input"
    />
  );
}
