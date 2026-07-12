"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function aceitarConvite(formData: FormData) {
  const code = formData.get("code") as string;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(`/convite/${code}`)}`);

  const { data: eventId, error } = await supabase.rpc("accept_invite", { p_code: code });

  if (error || !eventId) {
    redirect(`/convite/${code}?error=${encodeURIComponent(error?.message ?? "Convite inválido")}`);
  }

  redirect(`/eventos/${eventId}`);
}
