import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { sendMessage } from "./actions";

export default async function ChatConversaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: messages } = await supabase
    .from("messages")
    .select("id, sender_id, content, sent_at")
    .eq("conversation_id", id)
    .order("sent_at", { ascending: true });

  return (
    <main className="mx-auto flex max-w-3xl flex-col px-6 py-16">
      <h1 className="text-2xl font-semibold">Conversa</h1>

      <ul className="mt-6 flex flex-col gap-2">
        {messages?.map((m) => (
          <li
            key={m.id}
            className={`max-w-[75%] rounded-lg px-3 py-2 text-sm ${
              m.sender_id === user.id ? "self-end bg-black text-white" : "self-start bg-neutral-100"
            }`}
          >
            {m.content}
          </li>
        ))}
        {messages?.length === 0 && <p className="text-neutral-600">Nenhuma mensagem ainda.</p>}
      </ul>

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
