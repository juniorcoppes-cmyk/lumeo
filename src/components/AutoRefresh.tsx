"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// Recarrega os dados de servidor da rota atual periodicamente, sem a pessoa
// precisar atualizar a página. Usado em dois lugares:
//
// - `/inicio`, enquanto se espera o aceite do padrinho: a interface se
//   destrava sozinha no instante em que o acesso é liberado.
// - no layout logado, pelo aviso de mensagem não lida: o badge é calculado
//   no servidor, e neste framework o layout NÃO recalcula quando se navega
//   entre telas — sem isto, o contador congela no número de quando o app
//   foi aberto (foi exatamente o que o fundador viu em 2026-07-16).
//
// `router.refresh()` também traz mensagem nova pra conversa aberta, sem
// recarregar; e preserva o que estiver digitado, porque só re-renderiza os
// componentes de servidor.
export function AutoRefresh({ intervalMs = 15000 }: { intervalMs?: number }) {
  const router = useRouter();

  useEffect(() => {
    const id = setInterval(() => router.refresh(), intervalMs);
    return () => clearInterval(id);
  }, [router, intervalMs]);

  return null;
}
