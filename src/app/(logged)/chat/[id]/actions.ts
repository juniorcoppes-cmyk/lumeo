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
    redirect(
      `/chat/${conversationId}?error=${encodeURIComponent(
        "Seu período de teste gratuito acabou — assine um plano para continuar entrando em contato com outros perfis.",
      )}`,
    );
  }

  revalidatePath(`/chat/${conversationId}`);
}
