import Link from "next/link";
import { CardEvento } from "@/components/CardEvento";
import { eventosSeparados } from "@/lib/eventos";

export const metadata = { title: "Eventos que já aconteceram — Secret" };

export default async function EventosPassadosPage() {
  const { passados, erro } = await eventosSeparados();

  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <Link href="/eventos" className="text-sm text-accent no-underline">
        ‹ Eventos
      </Link>
      <h1 className="mt-2 text-2xl">Já aconteceram</h1>
      <p className="mt-1 text-sm text-muted">
        Do mais recente para trás. Dá pra abrir cada um e ver quem foi.
      </p>
      {erro && <p className="mt-4 text-sm text-red-400">{erro}</p>}

      <ul className="mt-6 flex flex-col gap-4">
        {passados.map((evento) => (
          <CardEvento key={evento.id} evento={evento} passado />
        ))}
        {passados.length === 0 && (
          <p className="text-muted">Nenhum evento no histórico ainda.</p>
        )}
      </ul>
    </main>
  );
}
