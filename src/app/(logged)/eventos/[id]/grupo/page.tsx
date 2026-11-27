import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getUser } from "@/lib/supabase/get-user";
import { GroupMessageBubble, type GroupMessage, type GroupPhoto } from "@/components/GroupMessageBubble";
import { GroupMessageComposer } from "@/components/GroupMessageComposer";
import { personaLabel, personaLabels } from "@/lib/persona";

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

  const [{ data: event }, { data: isMember }, { data: myProfile }] = await Promise.all([
    supabase.from("events").select("title, event_date").eq("id", id).single(),
    supabase.rpc("is_event_member", { p_event_id: id, p_user_id: user.id }),
    supabase.from("users").select("profile_type, gender, partner_gender").eq("id", user.id).single(),
  ]);
  const iAmCouple = myProfile?.profile_type === "casal";

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

  // Resolve o estado da foto de cada mensagem. Gera a URL assinada só quando
  // pode mostrar — temporária vencida vira "expirada", sem assinar.
  const agora = new Date();
  const photoEntries = await Promise.all(
    lista.map(async (m): Promise<[string, GroupPhoto | null]> => {
      if (!m.photo_path || m.deleted_at) return [m.id, null];
      const expired =
        m.photo_mode === "temporaria" &&
        !!m.photo_expires_at &&
        new Date(m.photo_expires_at) < agora;
      if (expired) return [m.id, { kind: "expired" }];

      const { data: signed } = await supabase.storage
        .from("profile-photos")
        .createSignedUrl(m.photo_path, 300);
      if (!signed?.signedUrl) return [m.id, null];
      return [m.id, { kind: "image", url: signed.signedUrl, mode: m.photo_mode }];
    }),
  );
  const photoById = new Map(photoEntries);

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
            personaLabel={personaLabel(m.sender_gender, m.sender_partner_gender, m.sender_persona)}
            photo={photoById.get(m.id) ?? null}
          />
        ))}
        {lista.length === 0 && (
          <p className="text-muted">Nenhuma mensagem ainda. Seja o primeiro a falar. 👋</p>
        )}
      </ul>

      {error && <p className="mt-4 text-sm text-red-400">{error}</p>}

      <GroupMessageComposer
        eventId={id}
        isCouple={iAmCouple}
        personaOptions={
          iAmCouple ? personaLabels(myProfile?.gender, myProfile?.partner_gender) : undefined
        }
      />
    </main>
  );
}
