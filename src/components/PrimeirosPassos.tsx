import Link from "next/link";
import type { Passo } from "@/lib/primeiros-passos";

// O cartão da trilha. Sem estado próprio: o que está feito vem do banco (ver
// lib/primeiros-passos.ts), então ele nunca mente sobre o perfil.
//
// Passo pronto continua na lista, riscado — serve de prova de progresso pra
// quem está inseguro, que é justamente o público daqui.
export function PrimeirosPassos({
  passos,
  aguardandoAcesso,
}: {
  passos: Passo[];
  aguardandoAcesso: boolean;
}) {
  const feitos = passos.filter((p) => p.feito).length;

  return (
    <section className="card mt-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-lg text-foreground">Seus primeiros passos</h2>
        <span className="text-sm text-muted tabular-nums">
          {feitos} de {passos.length}
        </span>
      </div>
      <p className="mt-1 text-sm text-muted">
        {aguardandoAcesso
          ? "Enquanto seu padrinho não responde, já dá pra deixar o perfil pronto. Sem pressa."
          : "No seu tempo. Cada passo aqui é o que faz alguém ter vontade de conhecer vocês."}
      </p>

      {/* Barra de progresso: a única coisa puramente decorativa do cartão, e
          ganha aria-hidden porque o "{feitos} de {n}" acima já diz o mesmo
          pra quem usa leitor de tela. */}
      <div
        aria-hidden
        className="mt-3 h-1 w-full overflow-hidden rounded-full bg-line"
      >
        <div
          className="h-full bg-accent transition-[width] duration-500"
          style={{ width: `${(feitos / passos.length) * 100}%` }}
        />
      </div>

      <ol className="mt-4 space-y-3">
        {passos.map((p, i) => (
          <li key={p.chave} className="flex items-start gap-3">
            <span
              aria-hidden
              className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs ${
                p.feito
                  ? "bg-accent text-on-accent"
                  : "border border-line text-muted"
              }`}
            >
              {p.feito ? "✓" : i + 1}
            </span>

            {/* No celular o botão vai ABAIXO do texto; só a partir de sm ele
                fica ao lado. Lado a lado em 375px espremia a descrição numa
                coluna de três palavras por linha. */}
            <div className="min-w-0 flex-1 sm:flex sm:items-center sm:justify-between sm:gap-4">
              <div className="min-w-0">
                <p
                  className={
                    p.feito
                      ? "text-sm text-muted line-through"
                      : "text-sm text-foreground"
                  }
                >
                  {p.titulo}
                </p>
                {!p.feito && (
                  <p className="mt-0.5 text-sm text-muted">{p.descricao}</p>
                )}
              </div>

              {!p.feito && (
                <Link
                  href={p.href}
                  className="btn-secondary mt-2 inline-block shrink-0 whitespace-nowrap text-sm no-underline sm:mt-0"
                >
                  {p.botao}
                </Link>
              )}
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
