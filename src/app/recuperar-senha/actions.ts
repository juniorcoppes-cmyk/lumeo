"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function requestPasswordReset(formData: FormData) {
  const email = formData.get("email") as string;
  const origin = (await headers()).get("origin");

  const supabase = await createClient();
  // resetPasswordForEmail nunca informa se o e-mail existe ou não (evita
  // enumeração de contas) — por isso a página sempre mostra a mesma
  // mensagem de sucesso, independente do resultado.
  await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/auth/confirm?next=/redefinir-senha`,
  });

  redirect("/recuperar-senha?sent=1");
}
