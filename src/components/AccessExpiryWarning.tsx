"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

// Guarda a data (AAAA-MM-DD) em que o aviso já apareceu neste aparelho, pra
// mostrar só no primeiro acesso do dia — no dia seguinte aparece de novo, já
// com a contagem atualizada. Fica no localStorage (mesmo padrão do PIN).
const KEY = "lumeo_access_warning_shown";

export function AccessExpiryWarning({
  kind,
  daysLeft,
}: {
  kind: "trial" | "subscription";
  daysLeft: number;
}) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const hoje = new Date().toLocaleDateString("sv-SE"); // AAAA-MM-DD local
    if (localStorage.getItem(KEY) === hoje) return;
    localStorage.setItem(KEY, hoje);
    setShow(true);
  }, []);

  if (!show) return null;

  const quando = daysLeft === 0 ? "hoje" : daysLeft === 1 ? "amanhã" : `em ${daysLeft} dias`;
  const titulo =
    kind === "trial"
      ? `Seu período de teste grátis termina ${quando}.`
      : `Sua mensalidade vence ${quando}.`;
  const detalhe =
    kind === "trial"
      ? "Depois disso, conversar com outros perfis exige um plano ativo."
      : "Confira se está tudo certo pra não perder o acesso.";

  return (
    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-on-accent-soft/50 bg-on-accent-soft/10 p-4 text-sm">
      <span className="text-foreground/90">
        <strong className="text-foreground">{titulo}</strong> {detalhe}
      </span>
      <div className="flex shrink-0 items-center gap-3">
        <Link href="/assinatura" className="btn-primary no-underline">
          Ver assinatura
        </Link>
        <button type="button" onClick={() => setShow(false)} className="text-xs text-muted">
          Fechar
        </button>
      </div>
    </div>
  );
}
