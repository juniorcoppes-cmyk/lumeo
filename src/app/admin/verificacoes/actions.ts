"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function approveVerification(formData: FormData) {
  const verificationId = formData.get("verification_id") as string;
  const supabase = await createClient();

  const { data: verification } = await supabase
    .from("verifications")
    .select("user_id")
    .eq("id", verificationId)
    .single();

  if (!verification) return;

  const badgeId = `LUM-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;

  await supabase
    .from("users")
    .update({ verification_badge_id: badgeId })
    .eq("id", verification.user_id);

  await supabase
    .from("verifications")
    .update({ status: "approved", reviewed_at: new Date().toISOString() })
    .eq("id", verificationId);

  revalidatePath("/admin/verificacoes");
}

export async function rejectVerification(formData: FormData) {
  const verificationId = formData.get("verification_id") as string;
  const reason = formData.get("rejection_reason") as string;

  if (!reason?.trim()) return;

  const supabase = await createClient();
  await supabase
    .from("verifications")
    .update({
      status: "rejected",
      rejection_reason: reason.trim(),
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", verificationId);

  revalidatePath("/admin/verificacoes");
}
