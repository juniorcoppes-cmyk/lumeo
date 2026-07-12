"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function createEvent(formData: FormData) {
  const title = formData.get("title") as string;
  const eventDate = formData.get("event_date") as string;
  const location = formData.get("location") as string;
  const capacity = Number(formData.get("capacity"));
  const price = Number(formData.get("price"));

  const supabase = await createClient();
  await supabase.from("events").insert({
    title,
    event_date: new Date(eventDate).toISOString(),
    location,
    capacity,
    price,
  });

  revalidatePath("/admin/eventos");
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
