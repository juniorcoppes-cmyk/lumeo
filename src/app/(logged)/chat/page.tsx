import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { startConversation } from "./actions";

export default async function ChatListPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: conversations } = await supabase
    .from("conversations")
    .select("id, event_id, user_a_id, user_b_id")
    .order("created_at", { ascending: false });

  const otherUserIds = (conversations ?? []).map((c) =>
    c.user_a_id === user.id ? c.user_b_id : c.user_a_id,
  );
  const eventIds = [...new Set((conversations ?? []).map((c) => c.event_id))];

  const [{ data: otherUsers }, { data: events }] = await Promise.all([
    otherUserIds.length
      ? supabase.from("users").select("id, name").in("id", otherUserIds)
      : Promise.resolve({ data: [] as { id: string; name: string }[] }),
    eventIds.length
      ? supabase.from("events").select("id, title").in("id", eventIds)
      : Promise.resolve({ data: [] as { id: string; title: string }[] }),
  ]);

  const { data: myRegistrations } = await supabase
    .from("event_registrations")
    .select("event_id, events(id, title)")
    .eq("status", "confirmed");

  const existingPairs = new Set(
    (conversations ?? []).map((c) => `${c.event_id}:${c.user_a_id === user.id ? c.user_b_id : c.user_a_id}`),
  );

  const attendeesByEvent = await Promise.all(
    (myRegistrations ?? []).map(async (reg) => {
      const { data: attendees } = await supabase.rpc("confirmed_attendees_for_event", {
        p_event_id: reg.event_id,
      });
      const event = Array.isArray(reg.events) ? reg.events[0] : reg.events;
      const newAttendees = (attendees ?? []).filter(
        (a: { id: string }) => !existingPairs.has(`${reg.event_id}:${a.id}`),
      );
      return { event, attendees: newAttendees };
    }),
  );

  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="text-2xl font-semibold">Conversas</h1>
      <p className="mt-2 text-neutral-600">
        Disponível apenas com pessoas confirmadas no mesmo evento.
      </p>
      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

      <ul className="mt-6 flex flex-col gap-2">
        {conversations?.map((c) => {
          const otherId = c.user_a_id === user.id ? c.user_b_id : c.user_a_id;
          const other = otherUsers?.find((u) => u.id === otherId);
          const event = events?.find((e) => e.id === c.event_id);
          return (
            <li key={c.id}>
              <Link href={`/chat/${c.id}`} className="rounded-lg border p-3 block hover:bg-neutral-50">
                <span className="font-medium">{other?.name}</span>
                <span className="text-sm text-neutral-600"> · {event?.title}</span>
              </Link>
            </li>
          );
        })}
        {conversations?.length === 0 && (
          <p className="text-neutral-600">Nenhuma conversa ainda.</p>
        )}
      </ul>

      {attendeesByEvent.some((e) => e.attendees.length > 0) && (
        <div className="mt-10">
          <h2 className="text-lg font-medium">Iniciar nova conversa</h2>
          {attendeesByEvent.map(
            ({ event, attendees }) =>
              attendees.length > 0 && (
                <div key={event?.id} className="mt-4">
                  <p className="text-sm text-neutral-500">{event?.title}</p>
                  <ul className="mt-2 flex flex-col gap-2">
                    {attendees.map((a: { id: string; name: string; verification_badge_id: string | null }) => (
                      <li key={a.id}>
                        <form action={startConversation} className="flex items-center gap-2">
                          <input type="hidden" name="event_id" value={event?.id} />
                          <input type="hidden" name="other_user_id" value={a.id} />
                          <span className="text-sm">{a.name}</span>
                          <button type="submit" className="rounded border px-2 py-1 text-sm">
                            Conversar
                          </button>
                        </form>
                      </li>
                    ))}
                  </ul>
                </div>
              ),
          )}
        </div>
      )}
    </main>
  );
}
