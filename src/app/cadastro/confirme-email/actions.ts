"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { friendlyAuthError } from "@/lib/auth-errors";

export async function resendConfirmation(formData: FormData) {
  const email = formData.get("email") as string;

  const supabase = await createClient();
  const { error } = await supabase.auth.resend({ type: "signup", email });

  const query = new URLSearchParams({ email });
  if (error) {
    query.set("error", friendlyAuthError(error.message, error.status));
  } else {
    query.set("sent", "1");
  }
  redirect(`/cadastro/confirme-email?${query.toString()}`);
}
