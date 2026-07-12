import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function InicioPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: events } = await supabase
    .from("events")
    .select("id, title, event_date, location")
    .gte("event_date", new Date().toISOString())
    .order("event_date", { ascending: true })
    .limit(5);

  const { data: invites } = user
    ? await supabase
        .from("event_invites")
        .select("id, status, event_id, events(title, event_date)")
        .eq("invitee_id", user.id)
        .order("created_at", { ascending: false })
    : { data: [] };

  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="text-2xl font-semibold">Início</h1>

      <section className="mt-8">
        <h2 className="text-lg font-medium">Próximos eventos</h2>
        <ul className="mt-3 flex flex-col gap-2">
          {events?.map((event) => (
            <li key={event.id}>
              <Link href={`/eventos/${event.id}`} className="rounded-lg border p-3 block hover:bg-neutral-50">
                <span className="font-medium">{event.title}</span>
                <span className="text-sm text-neutral-600">
                  {" "}
                  · {new Date(event.event_date).toLocaleString("pt-BR")} · {event.location}
                </span>
              </Link>
            </li>
          ))}
          {events?.length === 0 && <p className="text-neutral-600">Nenhum evento agendado.</p>}
        </ul>
      </section>

      {invites && invites.length > 0 && (
        <section className="mt-8">
          <h2 className="text-lg font-medium">Indicações recebidas</h2>
          <ul className="mt-3 flex flex-col gap-2">
            {invites.map((invite) => {
              const event = Array.isArray(invite.events) ? invite.events[0] : invite.events;
              return (
                <li key={invite.id}>
                  <Link href={`/eventos/${invite.event_id}`} className="rounded-lg border p-3 block hover:bg-neutral-50">
                    <span className="font-medium">{event?.title}</span>
                    <span className="text-sm text-neutral-600">
                      {" "}
                      · {event && new Date(event.event_date).toLocaleString("pt-BR")} · {invite.status}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </main>
  );
}
