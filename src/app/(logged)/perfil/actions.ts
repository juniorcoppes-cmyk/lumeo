"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function toggleDiscreetMode(formData: FormData) {
  const discreetMode = formData.get("discreet_mode") === "on";
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  await supabase
    .from("users")
    .update({ discreet_mode: discreetMode })
    .eq("id", user.id);

  revalidatePath("/perfil");
}

export async function updateExperienceLevel(formData: FormData) {
  const experienceLevel = formData.get("experience_level") as string;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  await supabase
    .from("users")
    .update({ experience_level: experienceLevel })
    .eq("id", user.id);

  revalidatePath("/perfil");
}

export async function updateLocation(latitude: number, longitude: number) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Arredonda pra ~1.1km de ruído — nunca guardamos a coordenada exata do
  // navegador, só o suficiente pra calcular faixas de distância grosseiras.
  const roundedLat = Math.round(latitude * 100) / 100;
  const roundedLng = Math.round(longitude * 100) / 100;

  await supabase
    .from("users")
    .update({
      latitude: roundedLat,
      longitude: roundedLng,
      location_updated_at: new Date().toISOString(),
    })
    .eq("id", user.id);

  revalidatePath("/perfil");
  revalidatePath("/comunidade");
}

export async function clearLocation(formData: FormData) {
  void formData;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  await supabase
    .from("users")
    .update({ latitude: null, longitude: null, location_updated_at: null })
    .eq("id", user.id);

  revalidatePath("/perfil");
  revalidatePath("/comunidade");
}

export async function uploadPhoto(formData: FormData) {
  const category = formData.get("category") as string;
  const file = formData.get("photo") as File;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const ext = file.name.split(".").pop() || "jpg";
  const path = `${user.id}/${category}/${crypto.randomUUID()}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from("profile-photos")
    .upload(path, file);

  if (uploadError) {
    redirect(`/perfil?error=${encodeURIComponent(uploadError.message)}`);
  }

  await supabase.from("profile_photos").insert({
    user_id: user.id,
    category,
    storage_path: path,
  });

  revalidatePath("/perfil");
}

export async function deletePhoto(formData: FormData) {
  const photoId = formData.get("photo_id") as string;
  const storagePath = formData.get("storage_path") as string;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  await supabase.storage.from("profile-photos").remove([storagePath]);
  await supabase.from("profile_photos").delete().eq("id", photoId).eq("user_id", user.id);

  revalidatePath("/perfil");
}

export async function respondPhotoRequest(formData: FormData) {
  const requestId = formData.get("request_id") as string;
  const decision = formData.get("decision") as string;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  await supabase
    .from("photo_access_requests")
    .update({ status: decision, responded_at: new Date().toISOString() })
    .eq("id", requestId)
    .eq("owner_id", user.id);

  revalidatePath("/perfil");
}
