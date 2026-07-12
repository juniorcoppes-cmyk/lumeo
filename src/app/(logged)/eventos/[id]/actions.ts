"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function inscrever(formData: FormData) {
  const eventId = formData.get("event_id") as string;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  await supabase.from("event_registrations").insert({
    event_id: eventId,
    user_id: user.id,
    status: "pending",
    payment_status: "pending",
  });

  revalidatePath(`/eventos/${eventId}`);
}
