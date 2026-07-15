"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { friendlyAuthError } from "@/lib/auth-errors";

export async function signUp(formData: FormData) {
  const name = formData.get("name") as string;
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const passwordConfirmation = formData.get("password_confirmation") as string;
  const profileType = formData.get("profile_type") as string;
  const experienceLevel = formData.get("experience_level") as string;
  const inviteCode = (formData.get("invite_code") as string) || undefined;

  if (password !== passwordConfirmation) {
    redirect(`/cadastro/dados?error=${encodeURIComponent("As senhas não coincidem.")}`);
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        name,
        profile_type: profileType,
        experience_level: experienceLevel,
        invite_code: inviteCode,
      },
    },
  });

  if (error) {
    redirect(
      `/cadastro/dados?error=${encodeURIComponent(friendlyAuthError(error.message, error.status))}`,
    );
  }

  // Sem sessão = confirmação de e-mail está exigida (nenhum login automático
  // acontece até a pessoa clicar no link enviado por e-mail).
  if (!data.session) {
    redirect(`/cadastro/confirme-email?email=${encodeURIComponent(email)}`);
  }

  redirect("/cadastro/documento");
}
