"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function setAdmin(formData: FormData) {
  const userId = formData.get("user_id") as string;
  const isAdmin = formData.get("is_admin") === "true";

  const supabase = await createClient();
  await supabase.from("users").update({ is_admin: !isAdmin }).eq("id", userId);

  revalidatePath("/admin/usuarios");
}

export async function setSubscriptionExempt(formData: FormData) {
  const userId = formData.get("user_id") as string;
  const exempt = formData.get("subscription_exempt") === "true";

  const supabase = await createClient();
  await supabase.from("users").update({ subscription_exempt: !exempt }).eq("id", userId);

  revalidatePath("/admin/usuarios");
}
