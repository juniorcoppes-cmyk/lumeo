import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getUser } from "@/lib/supabase/get-user";
import { GroupMessageBubble, type GroupMessage } from "@/components/GroupMessageBubble";
import { GroupMessageComposer } from "@/components/GroupMessageComposer";

export default async function GrupoDoEventoPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const { error } = await searchParams;
  const supabase = await createClient();

  const {
    data: { user },
  } = await getUser();
  if (!user) redirect("/login");

  const [{ data: event }, { data: isMember }] = await Promise.all([
    supabase.from("events").select("title, event_date").eq("id", id).single(),
    supabase.rpc("is_event_member", { p_event_id: id, p_user_id: user.id }),
  ]);

  if (!event) {
    return (
      <main className="mx-auto max-w-3xl px-6 py-16">
        <h1 className="text-2xl">Evento não encontrado</h1>
      </main>
    );
  }

  if (!isMember) {
    return (
      <main className="mx-auto max-w-3xl px-6 py-16">
        <h1 className="text-2xl">{event.title}</h1>
        <p className="mt-4 text-sm text-muted">
          O grupo deste evento é só pra quem foi convidado ou se inscreveu.{" "}
          <Link href={`/eventos/${id}`}>Voltar ao evento</Link>.
        </p>
      </main>
    );
  }

  const { data: messages } = await supabase.rpc("event_group_messages", { p_event_id: id });
  const lista = (messages ?? []) as GroupMessage[];

  return (
    <main className="mx-auto flex max-w-3xl flex-col px-6 py-16">
      <Link href={`/eventos/${id}`} className="text-sm text-muted no-underline hover:text-accent">
        ← {event.title}
      </Link>
      <h1 className="mt-1 text-2xl">Grupo do evento</h1>
      <p className="mt-1 text-sm text-muted">
        Conversa entre os convidados — combine detalhes e quebre o gelo antes de
        se encontrarem.
      </p>

      <ul className="mt-6 flex flex-col gap-2">
        {lista.map((m) => (
          <GroupMessageBubble
            key={m.id}
            message={m}
            eventId={id}
            isMine={m.sender_id === user.id}
          />
        ))}
        {lista.length === 0 && (
          <p className="text-muted">Nenhuma mensagem ainda. Seja o primeiro a falar. 👋</p>
        )}
      </ul>

      {error && <p className="mt-4 text-sm text-red-400">{error}</p>}

      <GroupMessageComposer eventId={id} />
    </main>
  );
}
