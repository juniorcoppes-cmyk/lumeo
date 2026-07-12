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

  const { error } = await supabase.from("event_registrations").insert({
    event_id: eventId,
    user_id: user.id,
    status: "pending",
    payment_status: "pending",
  });

  if (error) {
    redirect(`/eventos/${eventId}?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath(`/eventos/${eventId}`);
}

export async function convidarPorSelo(formData: FormData) {
  const eventId = formData.get("event_id") as string;
  const badgeId = (formData.get("badge_id") as string)?.trim();
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: invitee } = await supabase
    .from("users")
    .select("id")
    .eq("verification_badge_id", badgeId)
    .maybeSingle();

  if (!invitee) {
    redirect(`/eventos/${eventId}?error=${encodeURIComponent("Selo não encontrado")}`);
  }

  await supabase.from("event_invites").insert({
    event_id: eventId,
    inviter_id: user.id,
    invitee_id: invitee!.id,
  });

  revalidatePath(`/eventos/${eventId}`);
}

export async function gerarLinkConvite(formData: FormData) {
  const eventId = formData.get("event_id") as string;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  await supabase.from("event_invites").insert({
    event_id: eventId,
    inviter_id: user.id,
  });

  revalidatePath(`/eventos/${eventId}`);
}
