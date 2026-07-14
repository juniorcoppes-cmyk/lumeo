"use client";

import { useId, useState } from "react";

export function PasswordInput({
  name,
  placeholder,
  required,
  minLength,
  className,
}: {
  name: string;
  placeholder?: string;
  required?: boolean;
  minLength?: number;
  className?: string;
}) {
  const [visible, setVisible] = useState(false);
  const id = useId();

  return (
    <div className="relative">
      <input
        id={id}
        type={visible ? "text" : "password"}
        name={name}
        placeholder={placeholder}
        required={required}
        minLength={minLength}
        className={`w-full pr-16 ${className ?? ""}`}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-accent no-underline hover:underline"
        tabIndex={-1}
      >
        {visible ? "Ocultar" : "Mostrar"}
      </button>
    </div>
  );
}
