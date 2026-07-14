"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function updatePlan(formData: FormData) {
  const id = formData.get("id") as string;
  const name = formData.get("name") as string;
  const price = Number(formData.get("price"));
  const featuresRaw = formData.get("features") as string;
  const features = featuresRaw
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const supabase = await createClient();
  await supabase.from("plans").update({ name, price, features }).eq("id", id);

  revalidatePath("/admin/planos");
  revalidatePath("/planos");
  revalidatePath("/assinatura");
}
