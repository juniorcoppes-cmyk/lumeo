import Link from "next/link";
import { CardEvento } from "@/components/CardEvento";
import { eventosSeparados } from "@/lib/eventos";

export default async function EventosPage() {
  const { proximos, passados, erro } = await eventosSeparados();

  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="text-2xl">Eventos</h1>
      {erro && <p className="mt-4 text-sm text-red-400">{erro}</p>}

      <ul className="mt-6 flex flex-col gap-4">
        {proximos.map((evento) => (
          <CardEvento key={evento.id} evento={evento} />
        ))}
        {proximos.length === 0 && (
          <p className="text-muted">
            Nenhum evento marcado por enquanto. Assim que entrar um novo, ele aparece aqui.
          </p>
        )}
      </ul>

      {/* Os que já aconteceram saem da lista e ficam atrás de um botão
          (pedido do dono, 26/11/2026): eles iam se acumulando no topo e
          empurravam pra baixo o que ainda dá pra confirmar presença — que é
          a única coisa que a pessoa pode fazer nesta tela. Apagar não serve:
          evento passado é a prova de que a casa tem movimento, e é o que
          quem acabou de chegar vai querer ver. */}
      {passados.length > 0 && (
        <Link
          href="/eventos/passados"
          className="card mt-8 flex items-center justify-between gap-4 no-underline transition-colors hover:border-accent"
        >
          <div>
            <h2 className="text-base text-foreground">Eventos que já aconteceram</h2>
            <p className="mt-1 text-sm text-muted">
              {passados.length === 1
                ? "1 encontro no histórico"
                : `${passados.length} encontros no histórico`}
            </p>
          </div>
          <span className="btn-secondary shrink-0 whitespace-nowrap">Ver</span>
        </Link>
      )}
    </main>
  );
}
