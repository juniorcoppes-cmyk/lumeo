import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { contactSupport, startConversation } from "./actions";

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
  const eventIds = [
    ...new Set(
      (conversations ?? [])
        .map((c) => c.event_id)
        .filter((id): id is string => id !== null),
    ),
  ];

  const [{ data: otherUsersRaw }, { data: events }] = await Promise.all([
    otherUserIds.length
      ? supabase.from("users").select("id, name, avatar_path").in("id", otherUserIds)
      : Promise.resolve({ data: [] as { id: string; name: string; avatar_path: string | null }[] }),
    eventIds.length
      ? supabase.from("events").select("id, title").in("id", eventIds)
      : Promise.resolve({ data: [] as { id: string; title: string }[] }),
  ]);

  const otherUsers = await Promise.all(
    (otherUsersRaw ?? []).map(async (u) => {
      if (!u.avatar_path) return { ...u, avatarUrl: undefined };
      const { data } = await supabase.storage
        .from("profile-photos")
        .createSignedUrl(u.avatar_path, 300);
      return { ...u, avatarUrl: data?.signedUrl };
    }),
  );

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
      const withAvatars = await Promise.all(
        newAttendees.map(async (a: { avatar_path: string | null }) => {
          if (!a.avatar_path) return { ...a, avatarUrl: undefined };
          const { data } = await supabase.storage
            .from("profile-photos")
            .createSignedUrl(a.avatar_path, 300);
          return { ...a, avatarUrl: data?.signedUrl };
        }),
      );
      return { event, attendees: withAvatars };
    }),
  );

  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="text-2xl">Conversas</h1>
      <p className="mt-2 text-muted">
        Suas conversas com outros usuários verificados.
      </p>
      {error && <p className="mt-4 text-sm text-red-400">{error}</p>}

      <form action={contactSupport} className="mt-4">
        <button type="submit" className="btn-secondary">
          Falar com o suporte (ADM)
        </button>
      </form>

      <ul className="mt-6 flex flex-col gap-2">
        {conversations?.map((c) => {
          const otherId = c.user_a_id === user.id ? c.user_b_id : c.user_a_id;
          const other = otherUsers?.find((u) => u.id === otherId);
          const event = events?.find((e) => e.id === c.event_id);
          return (
            <li key={c.id} className="card flex items-center gap-3">
              {other?.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={other.avatarUrl}
                  alt=""
                  className="h-8 w-8 shrink-0 rounded-full object-cover"
                />
              ) : (
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent-soft text-[9px] text-muted">
                  —
                </div>
              )}
              <div>
                <Link href={`/perfil/${otherId}`} className="font-medium no-underline text-foreground hover:text-accent">
                  {other?.name}
                </Link>
                {event && (
                  <span className="text-sm text-muted"> · {event.title}</span>
                )}
                <Link href={`/chat/${c.id}`} className="ml-2 text-sm">
                  Abrir conversa
                </Link>
              </div>
            </li>
          );
        })}
        {conversations?.length === 0 && (
          <p className="text-muted">Nenhuma conversa ainda.</p>
        )}
      </ul>

      {attendeesByEvent.some((e) => e.attendees.length > 0) && (
        <div className="mt-10">
          <h2 className="text-lg">Iniciar nova conversa</h2>
          {attendeesByEvent.map(
            ({ event, attendees }) =>
              attendees.length > 0 && (
                <div key={event?.id} className="mt-4">
                  <p className="text-sm text-muted">{event?.title}</p>
                  <ul className="mt-2 flex flex-col gap-2">
                    {attendees.map((a: { id: string; name: string; avatarUrl?: string }) => (
                      <li key={a.id} className="flex items-center gap-2">
                        {a.avatarUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={a.avatarUrl}
                            alt=""
                            className="h-6 w-6 shrink-0 rounded-full object-cover"
                          />
                        ) : (
                          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent-soft text-[8px] text-muted">
                            —
                          </div>
                        )}
                        <Link href={`/perfil/${a.id}`} className="text-sm">
                          {a.name}
                        </Link>
                        <form action={startConversation}>
                          <input type="hidden" name="event_id" value={event?.id} />
                          <input type="hidden" name="other_user_id" value={a.id} />
                          <button type="submit" className="btn-secondary !px-2 !py-1 !text-xs">
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
