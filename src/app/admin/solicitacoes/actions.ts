"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

const STATUS = ["novo", "conversando", "aprovado", "recusado"] as const;

// Admin muda o status de um pedido de ingresso. Quem pode mexer é só admin —
// garantido pela RLS (policy "access_requests admin update" usa is_admin()).
export async function updateRequestStatus(formData: FormData) {
  const id = formData.get("id") as string;
  const status = formData.get("status") as string;
  if (!id || !STATUS.includes(status as (typeof STATUS)[number])) return;

  const supabase = await createClient();
  await supabase.from("access_requests").update({ status }).eq("id", id);
  revalidatePath("/admin/solicitacoes");
}
