"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function startConversation(formData: FormData) {
  const eventId = formData.get("event_id") as string;
  const otherUserId = formData.get("other_user_id") as string;

  const supabase = await createClient();
  const { data: conversationId, error } = await supabase.rpc("start_conversation", {
    p_event_id: eventId,
    p_other_user_id: otherUserId,
  });

  if (error || !conversationId) {
    redirect(`/chat?error=${encodeURIComponent(error?.message ?? "Não foi possível iniciar a conversa")}`);
  }

  redirect(`/chat/${conversationId}`);
}
