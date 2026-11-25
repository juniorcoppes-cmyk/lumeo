"use client";

import { useState } from "react";
import { submitAccessRequest } from "@/app/participar/actions";

// Formulário público de "quero participar" pra quem chega sem convite. A
// barreira nº1 do público é o medo de exposição, então o primeiro contato
// pede o MÍNIMO: apelido (não nome real), um contato à escolha e pouca coisa
// mais. O botão trava ao enviar (evita duplo clique) e, no sucesso, o form
// some e vira um agradecimento.
export function ParticiparForm() {
  const [state, setState] = useState<"idle" | "sending" | "done">("idle");
  const [error, setError] = useState<string | null>(null);
  const [contactType, setContactType] = useState<"whatsapp" | "email">("whatsapp");

  async function handle(formData: FormData) {
    if (state === "sending") return;
    setState("sending");
    setError(null);
    const r = await submitAccessRequest(formData);
    if (r.ok) {
      setState("done");
    } else {
      setError(r.error ?? "Não consegui enviar. Tente de novo.");
      setState("idle");
    }
  }

  if (state === "done") {
    return (
      <div className="card mt-6 border-green-700/50 bg-green-900/20 text-sm text-green-200">
        <p className="font-medium text-green-100">Recebemos seu interesse. 🤍</p>
        <p className="mt-2">
          A gente vai te procurar pelo contato que você deixou. Nada do que você
          enviou é público — só a administração vê. Pode fechar esta página.
        </p>
      </div>
    );
  }

  return (
    <form action={handle} className="mt-6 flex flex-col gap-4">
      <label className="flex flex-col gap-1 text-sm">
        Como quer ser chamado(a)
        <input
          type="text"
          name="apelido"
          placeholder="Um apelido — não precisa ser seu nome real"
          required
          maxLength={80}
          className="input"
        />
      </label>

      <div className="flex flex-col gap-1 text-sm">
        Seu contato
        <div className="flex gap-2">
          <select
            name="contact_type"
            value={contactType}
            onChange={(e) => setContactType(e.target.value as "whatsapp" | "email")}
            className="input w-32 shrink-0"
          >
            <option value="whatsapp">WhatsApp</option>
            <option value="email">E-mail</option>
          </select>
          <input
            type={contactType === "email" ? "email" : "text"}
            name="contact_value"
            inputMode={contactType === "whatsapp" ? "tel" : "email"}
            placeholder={contactType === "whatsapp" ? "(DDD) 90000-0000" : "seu@email.com"}
            required
            maxLength={160}
            className="input flex-1"
          />
        </div>
        <span className="text-xs text-muted">
          Escolha o que preferir — é por aqui que a gente fala com você.
        </span>
      </div>

      <label className="flex flex-col gap-1 text-sm">
        Cidade/região
        <input type="text" name="cidade" maxLength={120} className="input" />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        Você é
        <select name="profile_type" required defaultValue="" className="input">
          <option value="" disabled>
            Escolha…
          </option>
          <option value="casal">Casal</option>
          <option value="individual">Solteiro(a)</option>
        </select>
      </label>

      <label className="flex flex-col gap-1 text-sm">
        Conte rapidinho por que quer entrar <span className="text-muted">(opcional)</span>
        <textarea name="reason" rows={3} maxLength={600} className="input" />
      </label>

      {error && <p className="text-sm text-red-400">{error}</p>}

      <button type="submit" disabled={state === "sending"} className="btn-primary">
        {state === "sending" ? "Enviando…" : "Enviar meu interesse"}
      </button>
    </form>
  );
}
