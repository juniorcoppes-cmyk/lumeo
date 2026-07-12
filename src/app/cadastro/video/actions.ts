"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function uploadVideo(formData: FormData) {
  const file = formData.get("video") as File;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { error: uploadError } = await supabase.storage
    .from("verifications")
    .upload(`${user.id}/video`, file, { upsert: true });

  if (uploadError) {
    redirect(`/cadastro/video?error=${encodeURIComponent(uploadError.message)}`);
  }

  const { error: insertError } = await supabase.from("verifications").insert({
    user_id: user.id,
    document_url: `${user.id}/documento`,
    video_url: `${user.id}/video`,
    status: "pending",
  });

  if (insertError) {
    redirect(`/cadastro/video?error=${encodeURIComponent(insertError.message)}`);
  }

  redirect("/cadastro/padrinho");
}
