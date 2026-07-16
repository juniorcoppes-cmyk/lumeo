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
