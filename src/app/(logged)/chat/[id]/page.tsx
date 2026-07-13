import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
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
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Marca como lida qualquer mensagem do outro participante ainda não lida
  // ao abrir a conversa — é isso que faz o texto do remetente voltar ao
  // normal (deixa de estar em negrito) na tela dele.
  await supabase
    .from("messages")
    .update({ read_at: new Date().toISOString() })
    .eq("conversation_id", id)
    .is("read_at", null)
    .neq("sender_id", user.id);

  const { data: messages } = await supabase
    .from("messages")
    .select("id, sender_id, content, sent_at, read_at")
    .eq("conversation_id", id)
    .order("sent_at", { ascending: true });

  return (
    <main className="mx-auto flex max-w-3xl flex-col px-6 py-16">
      <h1 className="text-2xl font-semibold">Conversa</h1>

      <ul className="mt-6 flex flex-col gap-2">
        {messages?.map((m) => {
          const isMine = m.sender_id === user.id;
          const unread = isMine && !m.read_at;
          return (
            <li
              key={m.id}
              className={`flex max-w-[75%] flex-col gap-1 rounded-lg px-3 py-2 text-sm ${
                isMine ? "self-end bg-black text-white" : "self-start bg-neutral-100"
              } ${unread ? "font-bold" : "font-normal"}`}
            >
              <span>{m.content}</span>
              <span
                className={`text-xs ${isMine ? "text-neutral-300" : "text-neutral-500"} font-normal`}
              >
                {new Date(m.sent_at).toLocaleString("pt-BR")}
              </span>
            </li>
          );
        })}
        {messages?.length === 0 && <p className="text-neutral-600">Nenhuma mensagem ainda.</p>}
      </ul>

      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

      <form action={sendMessage} className="mt-6 flex gap-2">
        <input type="hidden" name="conversation_id" value={id} />
        <input
          type="text"
          name="content"
          placeholder="Escreva uma mensagem"
          required
          className="flex-1 rounded border px-3 py-2"
        />
        <button type="submit" className="rounded bg-black px-4 py-2 text-white">
          Enviar
        </button>
      </form>
    </main>
  );
}
