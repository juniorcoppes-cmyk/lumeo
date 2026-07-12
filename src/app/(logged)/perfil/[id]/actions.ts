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
