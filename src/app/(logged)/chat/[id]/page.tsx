import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getUser } from "@/lib/supabase/get-user";
import { formatarDataHora } from "@/lib/datas";
import { sendMessage } from "./actions";

export default async function ChatConversaPage({
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

  const deviceId = (await cookies()).get("lumeo_device_id")?.value;

  const { data: conversation } = await supabase
    .from("conversations")
    .select("user_a_id, user_b_id")
    .eq("id", id)
    .single();

  let other: {
    id: string;
    name: string;
    avatarUrl?: string;
    profileType: string;
    coupleSingleDevice: boolean;
  } | null = null;
  if (conversation) {
    const otherId = conversation.user_a_id === user.id ? conversation.user_b_id : conversation.user_a_id;
    const { data: otherProfile } = await supabase
      .from("users")
      .select("id, name, avatar_path, profile_type, couple_single_device")
      .eq("id", otherId)
      .single();
    if (otherProfile) {
      const avatarUrl = otherProfile.avatar_path
        ? (await supabase.storage.from("profile-photos").createSignedUrl(otherProfile.avatar_path, 300))
            .data?.signedUrl
        : undefined;
      other = {
        id: otherProfile.id,
        name: otherProfile.name,
        avatarUrl,
        profileType: otherProfile.profile_type,
        coupleSingleDevice: otherProfile.couple_single_device,
      };
    }
  }

  const { data: messages } = await supabase
    .from("messages")
    .select("id, sender_id, content, sent_at, message_reads(device_id)")
    .eq("conversation_id", id)
    .order("sent_at", { ascending: true });

  // Leitura por aparelho (não por conta) — perfil casal usa o mesmo login
  // em dois celulares, então "lido" é rastreado por dispositivo, não pela
  // conta. Marca como lida, pra ESTE aparelho, qualquer mensagem do outro
  // participante ainda não confirmada por ele.
  if (deviceId && messages) {
    const toMark = messages.filter(
      (m) =>
        m.sender_id !== user.id &&
        !(m.message_reads as { device_id: string }[]).some((r) => r.device_id === deviceId),
    );
    if (toMark.length > 0) {
      await supabase
        .from("message_reads")
        .upsert(
          toMark.map((m) => ({ message_id: m.id, device_id: deviceId })),
          { onConflict: "message_id,device_id" },
        );
    }
  }

  // Perfil casal só conta como "lida de verdade" quando 2 aparelhos
  // distintos do destinatário já confirmaram — cada parceiro no seu
  // celular. Perfil individual, basta 1 — casal que marcou "mesmo celular"
  // em /perfil também basta 1, senão nunca sairia do negrito.
  const requiredReaders =
    other?.profileType === "casal" && !other.coupleSingleDevice ? 2 : 1;

  return (
    <main className="mx-auto flex max-w-3xl flex-col px-6 py-16">
      {other ? (
        <Link href={`/perfil/${other.id}`} className="flex items-center gap-3 no-underline">
          {other.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={other.avatarUrl} alt="" className="h-10 w-10 rounded-full object-cover" />
          ) : (
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent-soft text-[10px] text-muted">
              —
            </div>
          )}
          <h1 className="text-2xl">{other.name}</h1>
        </Link>
      ) : (
        <h1 className="text-2xl">Conversa</h1>
      )}

      <ul className="mt-6 flex flex-col gap-2">
        {messages?.map((m) => {
          const isMine = m.sender_id === user.id;
          const distinctReaders = new Set(
            (m.message_reads as { device_id: string }[]).map((r) => r.device_id),
          ).size;
          const unread = isMine && distinctReaders < requiredReaders;
          return (
            <li
              key={m.id}
              className={`flex max-w-[75%] flex-col gap-1 rounded-[18px] px-3 py-2 text-sm ${
                isMine
                  ? "self-end bg-accent text-on-accent"
                  : "self-start border border-line bg-surface text-foreground"
              } ${unread ? "font-bold" : "font-normal"}`}
            >
              <span>{m.content}</span>
              <span
                className={`text-xs ${isMine ? "text-on-accent/70" : "text-muted"} font-normal`}
              >
                {formatarDataHora(m.sent_at)}
              </span>
            </li>
          );
        })}
        {messages?.length === 0 && <p className="text-muted">Nenhuma mensagem ainda.</p>}
      </ul>

      {error && <p className="mt-4 text-sm text-red-400">{error}</p>}

      <form action={sendMessage} className="mt-6 flex gap-2">
        <input type="hidden" name="conversation_id" value={id} />
        <input
          type="text"
          name="content"
          placeholder="Escreva uma mensagem"
          required
          className="input flex-1"
        />
        <button type="submit" className="btn-primary">
          Enviar
        </button>
      </form>
    </main>
  );
}
