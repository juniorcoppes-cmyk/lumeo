"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function togglePhotoLike(formData: FormData) {
  const photoId = formData.get("photo_id") as string;
  const revalidate = formData.get("revalidate_path") as string;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: existing } = await supabase
    .from("photo_likes")
    .select("photo_id")
    .eq("photo_id", photoId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (existing) {
    await supabase.from("photo_likes").delete().eq("photo_id", photoId).eq("user_id", user.id);
  } else {
    await supabase.from("photo_likes").insert({ photo_id: photoId, user_id: user.id });
  }

  if (revalidate) revalidatePath(revalidate);
}
