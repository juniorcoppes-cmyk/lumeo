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
  const action = formData.get("exempt_action") as "revoke" | "30_dias" | "indefinido";

  const supabase = await createClient();

  if (action === "revoke") {
    await supabase
      .from("users")
      .update({ subscription_exempt: false, subscription_exempt_until: null })
      .eq("id", userId);
  } else if (action === "30_dias") {
    const until = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    await supabase
      .from("users")
      .update({ subscription_exempt: true, subscription_exempt_until: until })
      .eq("id", userId);
  } else {
    await supabase
      .from("users")
      .update({ subscription_exempt: true, subscription_exempt_until: null })
      .eq("id", userId);
  }

  revalidatePath("/admin/usuarios");
}
