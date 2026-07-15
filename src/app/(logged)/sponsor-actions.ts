"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function respondSponsorship(formData: FormData) {
  const userId = formData.get("user_id") as string;
  const decision = formData.get("decision") as string;
  const name = (formData.get("name") as string) || "";

  const supabase = await createClient();
  await supabase.rpc("respond_sponsorship", { p_user_id: userId, p_decision: decision });

  revalidatePath("/", "layout");

  // No aceite, volta o padrinho pro app já com um lembrete pra avisar a pessoa
  // que ela já pode acessar (caso ainda haja outros apadrinhamentos pendentes,
  // o SponsorGate reaparece e o lembrete fica pra próxima).
  if (decision === "accept") {
    redirect(`/inicio?apadrinhado=${encodeURIComponent(name)}`);
  }
}
