"use server";

import { createServiceClient } from "@/lib/supabase/service";

export type SubmitResult = { ok: boolean; error?: string };

// Envio PÚBLICO (quem preenche não tem conta). Por isso grava via service_role
// e a validação mora toda aqui — a tabela access_requests não tem policy de
// insert, então esta action é a única porta de escrita.
export async function submitAccessRequest(formData: FormData): Promise<SubmitResult> {
  const apelido = (formData.get("apelido") as string)?.trim();
  const contactType = formData.get("contact_type") as string;
  const contactValue = (formData.get("contact_value") as string)?.trim();
  const cidade = ((formData.get("cidade") as string) || "").trim() || null;
  const profileType = formData.get("profile_type") as string;
  const reason = ((formData.get("reason") as string) || "").trim() || null;

  if (!apelido || apelido.length > 80) return { ok: false, error: "Preencha como quer ser chamado(a)." };
  if (contactType !== "whatsapp" && contactType !== "email")
    return { ok: false, error: "Escolha WhatsApp ou e-mail." };
  if (!contactValue || contactValue.length > 160)
    return { ok: false, error: "Preencha seu contato." };
  if (contactType === "email" && !contactValue.includes("@"))
    return { ok: false, error: "E-mail inválido." };
  if (profileType !== "individual" && profileType !== "casal")
    return { ok: false, error: "Escolha casal ou solteiro(a)." };
  if (cidade && cidade.length > 120) return { ok: false, error: "Cidade muito longa." };
  if (reason && reason.length > 600) return { ok: false, error: "Mensagem muito longa." };

  const supabase = createServiceClient();
  const { error } = await supabase.from("access_requests").insert({
    apelido,
    contact_type: contactType,
    contact_value: contactValue,
    cidade,
    profile_type: profileType,
    reason,
  });

  if (error) return { ok: false, error: "Não consegui enviar agora. Tente de novo em instantes." };
  return { ok: true };
}
