import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { EventMeta } from "@/components/EventMeta";

type EventRow = {
  id: string;
  title: string;
  event_date: string;
  location: string;
  address: string | null;
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
      <h1 className="text-2xl">Eventos</h1>
      {error && <p className="mt-4 text-sm text-red-400">{error.message}</p>}
      <ul className="mt-6 flex flex-col gap-4">
        {withThumbs.map((event) => {
          const vagasRestantes = event.capacity - Number(event.confirmed_count);
          return (
            <li key={event.id} className="overflow-hidden rounded-2xl border border-line bg-surface shadow-[0_8px_24px_-12px_rgba(214,82,79,0.25)]">
              {event.thumbUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={event.thumbUrl}
                  alt=""
                  className="aspect-[16/9] w-full object-cover"
                />
              )}
              <div className="p-4">
                <Link href={`/eventos/${event.id}`} className="text-lg font-medium">
                  {event.title}
                </Link>
                <EventMeta
                  eventDate={event.event_date}
                  location={event.location}
                  address={event.address}
                  className="mt-2"
                />
                <p className="mt-2 text-sm text-muted">
                  {Number(event.price) > 0 ? `R$ ${Number(event.price).toFixed(2)}` : "Gratuito"} ·{" "}
                  {vagasRestantes > 0 ? `${vagasRestantes} vagas restantes` : "Esgotado"}
                </p>
              </div>
            </li>
          );
        })}
        {rows.length === 0 && (
          <p className="text-muted">Nenhum evento disponível no momento.</p>
        )}
      </ul>
    </main>
  );
}
