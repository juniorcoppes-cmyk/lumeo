import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

type EventRow = {
  id: string;
  title: string;
  event_date: string;
  location: string;
  capacity: number;
  price: number;
  description: string | null;
  photo_landscape_path: string | null;
  confirmed_count: number;
};

export default async function EventosPage() {
  const supabase = await createClient();
  const { data: events, error } = await supabase.rpc("events_with_open_slots");
  const rows = (events ?? []) as EventRow[];

  const withThumbs = await Promise.all(
    rows.map(async (event) => {
      if (!event.photo_landscape_path) return { ...event, thumbUrl: undefined };
      const { data } = await supabase.storage
        .from("event-photos")
        .createSignedUrl(event.photo_landscape_path, 300);
      return { ...event, thumbUrl: data?.signedUrl };
    }),
  );

  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="text-2xl font-semibold">Eventos</h1>
      {error && <p className="mt-4 text-sm text-red-600">{error.message}</p>}
      <ul className="mt-6 flex flex-col gap-4">
        {withThumbs.map((event) => {
          const vagasRestantes = event.capacity - Number(event.confirmed_count);
          return (
            <li key={event.id} className="overflow-hidden rounded-lg border">
              {event.thumbUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={event.thumbUrl}
                  alt=""
                  className="aspect-[16/9] w-full object-cover"
                />
              )}
              <div className="p-4">
                <Link href={`/eventos/${event.id}`} className="text-lg font-medium underline">
                  {event.title}
                </Link>
                <p className="text-sm text-neutral-600">
                  {new Date(event.event_date).toLocaleString("pt-BR")} · {event.location} ·{" "}
                  {Number(event.price) > 0 ? `R$ ${Number(event.price).toFixed(2)}` : "Gratuito"}
                </p>
                {event.description && (
                  <p className="mt-1 line-clamp-2 text-sm text-neutral-600">{event.description}</p>
                )}
                <p className="mt-1 text-sm text-neutral-600">
                  {vagasRestantes > 0 ? `${vagasRestantes} vagas restantes` : "Esgotado"}
                </p>
              </div>
            </li>
          );
        })}
        {rows.length === 0 && (
          <p className="text-neutral-600">Nenhum evento disponível no momento.</p>
        )}
      </ul>
    </main>
  );
}
