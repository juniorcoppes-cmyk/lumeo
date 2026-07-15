"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { friendlyAuthError } from "@/lib/auth-errors";

export async function login(formData: FormData) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const rawNext = formData.get("next") as string;
  const next = rawNext?.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/inicio";

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    const message =
      error.code === "email_not_confirmed"
        ? "Seu e-mail ainda não foi confirmado — confira sua caixa de entrada ou peça um novo link de confirmação."
        : friendlyAuthError(error.message, error.status);
    redirect(`/login?error=${encodeURIComponent(message)}&next=${encodeURIComponent(next)}`);
  }

  redirect(next);
}
