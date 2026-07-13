"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function requestPhotoAccess(formData: FormData) {
  const ownerId = formData.get("owner_id") as string;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  await supabase.from("photo_access_requests").upsert(
    { requester_id: user.id, owner_id: ownerId, status: "pending", responded_at: null },
    { onConflict: "requester_id,owner_id" },
  );

  revalidatePath(`/perfil/${ownerId}`);
}

export async function proposeConnection(formData: FormData) {
  const targetId = formData.get("target_id") as string;
  const connectionType = formData.get("connection_type") as string;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  await supabase.from("user_connections").upsert(
    {
      requester_id: user.id,
      target_id: targetId,
      connection_type: connectionType,
      status: "pending",
      responded_at: null,
    },
    { onConflict: "requester_id,target_id" },
  );

  revalidatePath(`/perfil/${targetId}`);
}

export async function respondConnection(formData: FormData) {
  const connectionId = formData.get("connection_id") as string;
  const otherUserId = formData.get("other_user_id") as string;
  const decision = formData.get("decision") as string;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  await supabase
    .from("user_connections")
    .update({ status: decision, responded_at: new Date().toISOString() })
    .eq("id", connectionId)
    .eq("target_id", user.id);

  revalidatePath(`/perfil/${otherUserId}`);
}

export async function saveRating(formData: FormData) {
  const targetId = formData.get("target_id") as string;
  const targetRole = formData.get("target_role") as string;
  const tags = formData.getAll("tags") as string[];
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  if (tags.length === 0) {
    await supabase
      .from("profile_ratings")
      .delete()
      .eq("rater_id", user.id)
      .eq("target_id", targetId)
      .eq("target_role", targetRole);
  } else {
    await supabase.from("profile_ratings").upsert(
      {
        rater_id: user.id,
        target_id: targetId,
        target_role: targetRole,
        tags,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "rater_id,target_id,target_role" },
    );
  }

  revalidatePath(`/perfil/${targetId}`);
}
