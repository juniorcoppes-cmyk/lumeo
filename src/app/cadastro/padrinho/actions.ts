"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function setPadrinho(formData: FormData) {
  const badgeId = (formData.get("badge_id") as string)?.trim();
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  if (badgeId) {
    const { data: padrinho, error: lookupError } = await supabase
      .from("users")
      .select("id")
      .eq("verification_badge_id", badgeId)
      .maybeSingle();

    if (lookupError || !padrinho) {
      redirect("/cadastro/padrinho?error=Selo de padrinho não encontrado");
    }

    await supabase
      .from("users")
      .update({ referred_by: padrinho!.id })
      .eq("id", user.id);
  }

  redirect("/cadastro/aguardando");
}
