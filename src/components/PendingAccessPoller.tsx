"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// Enquanto o usuário aguarda o aceite do padrinho, atualiza a página
// periodicamente — assim, no instante em que o acesso é liberado, a interface
// se destrava sozinha, sem a pessoa precisar recarregar.
export function PendingAccessPoller({ intervalMs = 15000 }: { intervalMs?: number }) {
  const router = useRouter();

  useEffect(() => {
    const id = setInterval(() => router.refresh(), intervalMs);
    return () => clearInterval(id);
  }, [router, intervalMs]);

  return null;
}
