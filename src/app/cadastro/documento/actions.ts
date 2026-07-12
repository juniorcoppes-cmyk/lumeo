"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function uploadDocumento(formData: FormData) {
  const file = formData.get("documento") as File;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { error } = await supabase.storage
    .from("verifications")
    .upload(`${user.id}/documento`, file, { upsert: true });

  if (error) {
    redirect(`/cadastro/documento?error=${encodeURIComponent(error.message)}`);
  }

  redirect("/cadastro/video");
}
