"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

async function uploadEventPhoto(
  supabase: Awaited<ReturnType<typeof createClient>>,
  eventId: string,
  file: File,
  slot: "story" | "landscape",
) {
  const ext = file.name.split(".").pop() || "jpg";
  const path = `${eventId}/${slot}.${ext}`;

  const { error } = await supabase.storage
    .from("event-photos")
    .upload(path, file, { upsert: true });

  if (error) return null;
  return path;
}

export async function createEvent(formData: FormData) {
  const title = formData.get("title") as string;
  const eventDate = formData.get("event_date") as string;
  const location = formData.get("location") as string;
  const address = (formData.get("address") as string)?.trim() || null;
  const capacity = Number(formData.get("capacity"));
  const price = Number(formData.get("price"));
  const description = (formData.get("description") as string)?.trim() || null;
  const plusPriceRaw = formData.get("plus_price") as string;
  const plusPrice = plusPriceRaw?.trim() ? Number(plusPriceRaw) : null;
  const storyPhoto = formData.get("story_photo") as File | null;
  const landscapePhoto = formData.get("landscape_photo") as File | null;

  const supabase = await createClient();
  const { data: event, error } = await supabase
    .from("events")
    .insert({
      title,
      event_date: new Date(eventDate).toISOString(),
      location,
      address,
      capacity,
      price,
      description,
      plus_price: plusPrice,
    })
    .select("id")
    .single();

  if (error || !event) {
    revalidatePath("/admin/eventos");
    return;
  }

  const photoPaths: { photo_story_path?: string; photo_landscape_path?: string } = {};

  if (storyPhoto && storyPhoto.size > 0) {
    const path = await uploadEventPhoto(supabase, event.id, storyPhoto, "story");
    if (path) photoPaths.photo_story_path = path;
  }
  if (landscapePhoto && landscapePhoto.size > 0) {
    const path = await uploadEventPhoto(supabase, event.id, landscapePhoto, "landscape");
    if (path) photoPaths.photo_landscape_path = path;
  }

  if (Object.keys(photoPaths).length > 0) {
    await supabase.from("events").update(photoPaths).eq("id", event.id);
  }

  revalidatePath("/admin/eventos");
  revalidatePath("/eventos");
}

export async function updateEventPhotos(formData: FormData) {
  const eventId = formData.get("event_id") as string;
  const storyPhoto = formData.get("story_photo") as File | null;
  const landscapePhoto = formData.get("landscape_photo") as File | null;

  const supabase = await createClient();
  const photoPaths: { photo_story_path?: string; photo_landscape_path?: string } = {};

  if (storyPhoto && storyPhoto.size > 0) {
    const path = await uploadEventPhoto(supabase, eventId, storyPhoto, "story");
    if (path) photoPaths.photo_story_path = path;
  }
  if (landscapePhoto && landscapePhoto.size > 0) {
    const path = await uploadEventPhoto(supabase, eventId, landscapePhoto, "landscape");
    if (path) photoPaths.photo_landscape_path = path;
  }

  if (Object.keys(photoPaths).length > 0) {
    await supabase.from("events").update(photoPaths).eq("id", eventId);
  }

  revalidatePath("/admin/eventos");
  revalidatePath("/eventos");
  revalidatePath(`/eventos/${eventId}`);
}

export async function updateEvent(formData: FormData) {
  const eventId = formData.get("event_id") as string;
  const title = formData.get("title") as string;
  const eventDate = formData.get("event_date") as string;
  const location = formData.get("location") as string;
  const address = (formData.get("address") as string)?.trim() || null;
  const capacity = Number(formData.get("capacity"));
  const price = Number(formData.get("price"));
  const description = (formData.get("description") as string)?.trim() || null;
  const plusPriceRaw = formData.get("plus_price") as string;
  const plusPrice = plusPriceRaw?.trim() ? Number(plusPriceRaw) : null;

  const supabase = await createClient();
  await supabase
    .from("events")
    .update({
      title,
      event_date: new Date(eventDate).toISOString(),
      location,
      address,
      capacity,
      price,
      description,
      plus_price: plusPrice,
    })
    .eq("id", eventId);

  revalidatePath("/admin/eventos");
  revalidatePath("/eventos");
  revalidatePath(`/eventos/${eventId}`);
}

export async function deleteEvent(formData: FormData) {
  const eventId = formData.get("event_id") as string;

  const supabase = await createClient();
  const { data: event } = await supabase
    .from("events")
    .select("photo_story_path, photo_landscape_path")
    .eq("id", eventId)
    .single();

  const paths = [event?.photo_story_path, event?.photo_landscape_path].filter(
    (path): path is string => !!path,
  );
  if (paths.length > 0) {
    await supabase.storage.from("event-photos").remove(paths);
  }

  // FKs em cascade (event_registrations, event_invites, conversations,
  // timeline_posts do tipo event_confirmed) já cuidam do resto.
  await supabase.from("events").delete().eq("id", eventId);

  revalidatePath("/admin/eventos");
  revalidatePath("/eventos");
}

export async function updateRegistrationStatus(formData: FormData) {
  const registrationId = formData.get("registration_id") as string;
  const status = formData.get("status") as string;

  const supabase = await createClient();
  await supabase
    .from("event_registrations")
    .update({ status })
    .eq("id", registrationId);

  revalidatePath("/admin/eventos");
}
