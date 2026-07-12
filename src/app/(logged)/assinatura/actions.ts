"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function choosePlan(formData: FormData) {
  const plan = formData.get("plan") as string;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  await supabase
    .from("subscriptions")
    .upsert({ user_id: user.id, plan, status: "pending_payment" }, { onConflict: "user_id" });

  revalidatePath("/assinatura");
}
