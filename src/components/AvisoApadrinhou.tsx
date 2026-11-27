"use client";

import { useEffect } from "react";

// Aviso verde que aparece UMA vez, logo depois que o padrinho aceita um
// apadrinhamento (o redirect manda pra /inicio?apadrinhado=<nome>). O problema
// que isto resolve: sem limpar a URL, o parâmetro fica grudado e, a cada
// atualização da página, o aviso reaparecia como se o aceite tivesse acabado de
// acontecer.
//
// A limpeza usa history.replaceState (não router.replace) de propósito: troca
// só a barra de endereço, sem disparar re-render do componente de servidor.
// Assim o aviso continua na tela nesta visita, mas um F5 recarrega /inicio já
// sem o parâmetro — e o aviso não volta.
export function AvisoApadrinhou({ nome }: { nome: string }) {
  useEffect(() => {
    const url = new URL(window.location.href);
    if (url.searchParams.has("apadrinhado")) {
      url.searchParams.delete("apadrinhado");
      window.history.replaceState(null, "", url.pathname + url.search);
    }
  }, []);

  return (
    <div className="mt-4 rounded-2xl border border-green-700/50 bg-green-900/25 p-4 text-sm text-green-200">
      Você aceitou <strong className="text-green-100">{nome}</strong>! Avise que já pode
      acessar o Secret — é só entrar em www.socialsecret.com.br.
    </div>
  );
}
