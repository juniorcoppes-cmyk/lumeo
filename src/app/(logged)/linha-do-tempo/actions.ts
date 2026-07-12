"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function createTextPost(formData: FormData) {
  const content = (formData.get("content") as string)?.trim();
  if (!content) return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  await supabase.from("timeline_posts").insert({
    user_id: user.id,
    type: "text",
    content,
  });

  revalidatePath("/linha-do-tempo");
}

export async function deleteTextPost(formData: FormData) {
  const postId = formData.get("post_id") as string;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  await supabase
    .from("timeline_posts")
    .delete()
    .eq("id", postId)
    .eq("user_id", user.id)
    .eq("type", "text");

  revalidatePath("/linha-do-tempo");
}
