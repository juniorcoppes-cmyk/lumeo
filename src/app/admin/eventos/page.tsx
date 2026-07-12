import { createClient } from "@/lib/supabase/server";
import { createEvent, updateRegistrationStatus } from "./actions";

export default async function AdminEventosPage() {
  const supabase = await createClient();

  const { data: events } = await supabase
    .from("events")
    .select(
      "id, title, event_date, location, capacity, event_registrations(id, status, users(name, email))",
    )
    .order("event_date", { ascending: true });

  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="text-2xl font-semibold">Eventos (admin)</h1>

      <form action={createEvent} className="mt-6 flex flex-col gap-3 rounded-lg border p-4">
        <h2 className="font-medium">Criar evento</h2>
        <input type="text" name="title" placeholder="Título" required className="rounded border px-3 py-2" />
        <input type="datetime-local" name="event_date" required className="rounded border px-3 py-2" />
        <input type="text" name="location" placeholder="Local" required className="rounded border px-3 py-2" />
        <input
          type="number"
          name="capacity"
          placeholder="Capacidade"
          min={1}
          required
          className="rounded border px-3 py-2"
        />
        <button type="submit" className="self-start rounded bg-black px-4 py-2 text-white">
          Criar
        </button>
      </form>

      <ul className="mt-8 flex flex-col gap-6">
        {events?.map((event) => (
          <li key={event.id} className="rounded-lg border p-4">
            <h3 className="text-lg font-medium">{event.title}</h3>
            <p className="text-sm text-neutral-600">
              {new Date(event.event_date).toLocaleString("pt-BR")} · {event.location} ·
              {" "}capacidade {event.capacity}
            </p>

            <ul className="mt-3 flex flex-col gap-2">
              {event.event_registrations?.map((reg) => {
                const user = Array.isArray(reg.users) ? reg.users[0] : reg.users;
                return (
                  <li key={reg.id} className="flex items-center justify-between text-sm">
                    <span>
                      {user?.name} ({user?.email}) — {reg.status}
                    </span>
                    <div className="flex gap-2">
                      <form action={updateRegistrationStatus}>
                        <input type="hidden" name="registration_id" value={reg.id} />
                        <input type="hidden" name="status" value="confirmed" />
                        <button type="submit" className="rounded border px-2 py-1">
                          Confirmar
                        </button>
                      </form>
                      <form action={updateRegistrationStatus}>
                        <input type="hidden" name="registration_id" value={reg.id} />
                        <input type="hidden" name="status" value="cancelled" />
                        <button type="submit" className="rounded border px-2 py-1">
                          Cancelar
                        </button>
                      </form>
                    </div>
                  </li>
                );
              })}
              {event.event_registrations?.length === 0 && (
                <li className="text-sm text-neutral-500">Nenhum inscrito ainda.</li>
              )}
            </ul>
          </li>
        ))}
      </ul>
    </main>
  );
}
