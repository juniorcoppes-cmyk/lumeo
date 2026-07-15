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
  const preferredPlan = (formData.get("preferred_plan") as string) || undefined;
  const platformInviteCode = formData.get("platform_invite_code") as string;

  if (password !== passwordConfirmation) {
    redirect(
      `/cadastro/dados?code=${encodeURIComponent(platformInviteCode)}&error=${encodeURIComponent("As senhas não coincidem.")}`,
    );
  }

  const supabase = await createClient();

  // Revalida o convite no servidor (defesa em profundidade — a página já
  // checa antes de mostrar o formulário, mas o form em si não tem como
  // impedir uma chamada direta à action sem passar pela página).
  const { data: previewRows } = await supabase.rpc("get_platform_invite_preview", {
    p_code: platformInviteCode,
  });
  if (!previewRows?.[0]?.valid) {
    redirect(
      `/cadastro/dados?code=${encodeURIComponent(platformInviteCode)}&error=${encodeURIComponent("Esse link de convite não é mais válido.")}`,
    );
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        name,
        profile_type: profileType,
        experience_level: experienceLevel,
        platform_invite_code: platformInviteCode,
        preferred_plan: preferredPlan,
      },
    },
  });

  if (error) {
    redirect(
      `/cadastro/dados?code=${encodeURIComponent(platformInviteCode)}&error=${encodeURIComponent(friendlyAuthError(error.message, error.status))}`,
    );
  }

  // Sem sessão = confirmação de e-mail está exigida (nenhum login automático
  // acontece até a pessoa clicar no link enviado por e-mail).
  if (!data.session) {
    redirect(`/cadastro/confirme-email?email=${encodeURIComponent(email)}`);
  }

  // Já entra no app: cai no /inicio em modo limitado (vê a home e o "Comece
  // por aqui", sem comunidade/chat) e aguarda ali o aceite do padrinho, que
  // libera o resto automaticamente.
  redirect("/inicio");
}
