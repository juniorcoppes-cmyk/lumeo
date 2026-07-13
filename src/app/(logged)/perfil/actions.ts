"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { parseBirthDateInput } from "@/lib/profile-options";

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

export async function updateProfileDetails(formData: FormData) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("users")
    .select("profile_type")
    .eq("id", user.id)
    .single();

  const bio = (formData.get("bio") as string)?.trim() || null;
  const birthDate = parseBirthDateInput(formData.get("birth_date") as string);
  const gender = (formData.get("gender") as string) || null;
  const sexualOrientation = (formData.get("sexual_orientation") as string) || null;
  const lookingFor = formData.getAll("looking_for") as string[];

  const update: Record<string, unknown> = {
    bio,
    birth_date: birthDate,
    gender,
    sexual_orientation: sexualOrientation,
    looking_for: lookingFor.length > 0 ? lookingFor : null,
  };

  if (profile?.profile_type === "casal") {
    update.partner_birth_date = parseBirthDateInput(formData.get("partner_birth_date") as string);
    update.partner_gender = (formData.get("partner_gender") as string) || null;
    update.partner_sexual_orientation =
      (formData.get("partner_sexual_orientation") as string) || null;
  }

  await supabase.from("users").update(update).eq("id", user.id);

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

export async function updateAvatar(formData: FormData) {
  const file = formData.get("avatar") as File;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("users")
    .select("avatar_path")
    .eq("id", user.id)
    .single();

  const ext = file.name.split(".").pop() || "jpg";
  const path = `${user.id}/avatar/foto.${ext}`;

  // Se a extensão mudou, o upsert não substitui o arquivo antigo (nome
  // diferente) — precisa apagar antes, senão fica órfão no storage.
  if (profile?.avatar_path && profile.avatar_path !== path) {
    await supabase.storage.from("profile-photos").remove([profile.avatar_path]);
  }

  const { error: uploadError } = await supabase.storage
    .from("profile-photos")
    .upload(path, file, { upsert: true });

  if (uploadError) {
    redirect(`/perfil?error=${encodeURIComponent(uploadError.message)}`);
  }

  await supabase.from("users").update({ avatar_path: path }).eq("id", user.id);

  revalidatePath("/perfil");
  revalidatePath("/comunidade");
}

export async function removeAvatar(formData: FormData) {
  void formData;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("users")
    .select("avatar_path")
    .eq("id", user.id)
    .single();

  if (profile?.avatar_path) {
    await supabase.storage.from("profile-photos").remove([profile.avatar_path]);
  }

  await supabase.from("users").update({ avatar_path: null }).eq("id", user.id);

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
