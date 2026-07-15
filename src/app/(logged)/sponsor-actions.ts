"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function respondSponsorship(formData: FormData) {
  const userId = formData.get("user_id") as string;
  const decision = formData.get("decision") as string;

  const supabase = await createClient();
  await supabase.rpc("respond_sponsorship", { p_user_id: userId, p_decision: decision });

  revalidatePath("/", "layout");
}
