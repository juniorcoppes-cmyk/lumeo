"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

// Chat de grupo do evento. As regras de "quem pode ler/escrever" moram no RLS
// da tabela event_messages (só membro do evento, só em nome próprio), então
// aqui é só repassar — se a pessoa não for do grupo, o insert é barrado no
// banco.
export async function enviarMensagemGrupo(formData: FormData) {
  const eventId = formData.get("event_id") as string;
  const content = (formData.get("content") as string)?.trim();
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  if (!content) return;

  const { error } = await supabase
    .from("event_messages")
    .insert({ event_id: eventId, sender_id: user.id, content });

  if (error) {
    redirect(`/eventos/${eventId}/grupo?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath(`/eventos/${eventId}/grupo`);
}

export async function editarMensagemGrupo(formData: FormData) {
  const eventId = formData.get("event_id") as string;
  const messageId = formData.get("message_id") as string;
  const content = (formData.get("content") as string)?.trim();
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  if (!content) return;

  // O RLS (sender_id = auth.uid()) garante que ninguém edita a mensagem de
  // outro; o filtro aqui é só defensivo.
  await supabase
    .from("event_messages")
    .update({ content, edited_at: new Date().toISOString() })
    .eq("id", messageId)
    .eq("sender_id", user.id)
    .is("deleted_at", null);

  revalidatePath(`/eventos/${eventId}/grupo`);
}

export async function excluirMensagemGrupo(formData: FormData) {
  const eventId = formData.get("event_id") as string;
  const messageId = formData.get("message_id") as string;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Exclusão é "soft": marca a hora e apaga o texto, pra conversa não ficar
  // com buraco mas o conteúdo sumir de verdade.
  await supabase
    .from("event_messages")
    .update({ deleted_at: new Date().toISOString(), content: "" })
    .eq("id", messageId)
    .eq("sender_id", user.id);

  revalidatePath(`/eventos/${eventId}/grupo`);
}
