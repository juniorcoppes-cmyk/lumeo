"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function addPhotoComment(formData: FormData) {
  const photoId = formData.get("photo_id") as string;
  const content = (formData.get("content") as string)?.trim();
  const revalidate = formData.get("revalidate_path") as string;
  if (!content) return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  await supabase.from("photo_comments").insert({
    photo_id: photoId,
    author_id: user.id,
    content,
  });

  if (revalidate) revalidatePath(revalidate);
}

export async function deletePhotoComment(formData: FormData) {
  const commentId = formData.get("comment_id") as string;
  const revalidate = formData.get("revalidate_path") as string;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // RLS decide quem pode apagar (autor do comentário ou dono da foto).
  await supabase.from("photo_comments").delete().eq("id", commentId);

  if (revalidate) revalidatePath(revalidate);
}
