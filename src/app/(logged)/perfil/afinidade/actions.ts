"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { INTERESTS, PACE, SETTINGS } from "@/lib/affinity";

// Só aceita chaves conhecidas — evita lixo vindo do formulário.
function onlyKnown(values: string[], group: Record<string, string>): string[] {
  return values.filter((v) => v in group);
}

export async function salvarAfinidade(formData: FormData) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const interests = onlyKnown(formData.getAll("interests") as string[], INTERESTS);
  const settings = onlyKnown(formData.getAll("settings") as string[], SETTINGS);
  const paceRaw = formData.get("pace") as string | null;
  const pace = paceRaw && paceRaw in PACE ? paceRaw : null;

  const { error } = await supabase.from("profile_affinity").upsert(
    {
      user_id: user.id,
      interests,
      pace,
      settings,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );

  if (error) {
    redirect(`/perfil/afinidade?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/perfil/afinidade");
  redirect("/perfil?afinidade=salva");
}
