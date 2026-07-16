"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function sendMessage(formData: FormData) {
  const conversationId = formData.get("conversation_id") as string;
  const content = (formData.get("content") as string)?.trim();

  if (!content) return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { error } = await supabase.from("messages").insert({
    conversation_id: conversationId,
    sender_id: user.id,
    content,
  });

  if (error) {
    // A RLS de insert não propaga o texto do erro, então perguntamos ao banco
    // qual é o motivo real do bloqueio. Se não for bloqueio de contato (motivo
    // null), o problema é outro — antes o código culpava o fim do teste em
    // QUALQUER falha, o que mentia pra quem só esbarrou noutro erro.
    const { data: motivo } = await supabase.rpc("contact_block_reason", {
      p_user_id: user.id,
    });
    redirect(
      `/chat/${conversationId}?error=${encodeURIComponent(
        (motivo as string | null) ?? "Não consegui enviar sua mensagem. Tente de novo.",
      )}`,
    );
  }

  revalidatePath(`/chat/${conversationId}`);
}

export async function editMessage(formData: FormData) {
  const conversationId = formData.get("conversation_id") as string;
  const messageId = formData.get("message_id") as string;
  const content = (formData.get("content") as string)?.trim();

  if (!content) return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // `eq("sender_id", user.id)` é defesa em profundidade, não a trava: quem
  // barra de verdade é o trigger `protect_message_content` no banco, que
  // vale inclusive pra quem chamar a API direto, sem passar por aqui.
  // `edited_at` não vai daqui de propósito — é o banco que carimba.
  const { error } = await supabase
    .from("messages")
    .update({ content })
    .eq("id", messageId)
    .eq("sender_id", user.id);

  if (error) {
    redirect(
      `/chat/${conversationId}?error=${encodeURIComponent(
        "Não consegui editar sua mensagem. Tente de novo.",
      )}`,
    );
  }

  revalidatePath(`/chat/${conversationId}`);
}

export async function deleteMessage(formData: FormData) {
  const conversationId = formData.get("conversation_id") as string;
  const messageId = formData.get("message_id") as string;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Só marca a exclusão — é o trigger que arquiva o texto em
  // `deleted_message_contents` (prova pra denúncia, só admin lê) e limpa o
  // conteúdo da linha, pra que o outro participante não consiga ler o texto
  // "apagado" pela API.
  const { error } = await supabase
    .from("messages")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", messageId)
    .eq("sender_id", user.id);

  if (error) {
    redirect(
      `/chat/${conversationId}?error=${encodeURIComponent(
        "Não consegui excluir sua mensagem. Tente de novo.",
      )}`,
    );
  }

  revalidatePath(`/chat/${conversationId}`);
}
