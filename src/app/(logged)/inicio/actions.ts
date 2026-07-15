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

  revalidatePath("/inicio");
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

  revalidatePath("/inicio");
}

export async function generatePlatformInvite(formData: FormData) {
  void formData;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  await supabase.from("platform_invites").insert({ inviter_id: user.id });

  revalidatePath("/inicio");
}

export async function respondInvite(formData: FormData) {
  const inviteId = formData.get("invite_id") as string;
  const status = formData.get("status") as string;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  await supabase.rpc("respond_invite", { p_invite_id: inviteId, p_status: status });

  revalidatePath("/inicio");
}
