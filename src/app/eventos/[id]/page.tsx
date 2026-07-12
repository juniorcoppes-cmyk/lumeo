export default async function EventoDetalhePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="text-2xl font-semibold">Evento {id}</h1>
      <p className="mt-2 text-neutral-600">
        Detalhe do evento, inscrição e opção de indicar um amigo.
      </p>
    </main>
  );
}
