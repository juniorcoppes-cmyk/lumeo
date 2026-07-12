"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function toggleDiscreetMode(formData: FormData) {
  const discreetMode = formData.get("discreet_mode") === "on";
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  await supabase
    .from("users")
    .update({ discreet_mode: discreetMode })
    .eq("id", user.id);

  revalidatePath("/perfil");
}
