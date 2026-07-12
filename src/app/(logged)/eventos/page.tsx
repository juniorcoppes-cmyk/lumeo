import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function EventosPage() {
  const supabase = await createClient();
  const { data: events, error } = await supabase.rpc("events_with_open_slots");

  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="text-2xl font-semibold">Eventos</h1>
      {error && <p className="mt-4 text-sm text-red-600">{error.message}</p>}
      <ul className="mt-6 flex flex-col gap-4">
        {events?.map((event: {
          id: string;
          title: string;
          event_date: string;
          location: string;
          capacity: number;
          confirmed_count: number;
        }) => {
          const vagasRestantes = event.capacity - Number(event.confirmed_count);
          return (
            <li key={event.id} className="rounded-lg border p-4">
              <Link href={`/eventos/${event.id}`} className="text-lg font-medium underline">
                {event.title}
              </Link>
              <p className="text-sm text-neutral-600">
                {new Date(event.event_date).toLocaleString("pt-BR")} · {event.location}
              </p>
              <p className="text-sm text-neutral-600">
                {vagasRestantes > 0 ? `${vagasRestantes} vagas restantes` : "Esgotado"}
              </p>
            </li>
          );
        })}
        {events?.length === 0 && (
          <p className="text-neutral-600">Nenhum evento disponível no momento.</p>
        )}
      </ul>
    </main>
  );
}
