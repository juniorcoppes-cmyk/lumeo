"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function markReportReviewed(formData: FormData) {
  const reportId = formData.get("report_id") as string;
  const adminNotes = (formData.get("admin_notes") as string)?.trim() || null;

  const supabase = await createClient();
  await supabase
    .from("user_reports")
    .update({ status: "reviewed", admin_notes: adminNotes, reviewed_at: new Date().toISOString() })
    .eq("id", reportId);

  revalidatePath("/admin/denuncias");
}
