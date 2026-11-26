"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

const STATUS = ["novo", "conversando", "aprovado", "recusado"] as const;

// Admin muda o status de um pedido de ingresso. Quem pode mexer é só admin —
// garantido pela RLS (policy "access_requests admin update" usa is_admin()).
export async function updateRequestStatus(formData: FormData) {
  const id = formData.get("id") as string;
  const status = formData.get("status") as string;
  if (!id || !STATUS.includes(status as (typeof STATUS)[number])) return;

  const supabase = await createClient();
  await supabase.from("access_requests").update({ status }).eq("id", id);
  revalidatePath("/admin/solicitacoes");
}

/// APROVAR E LIBERAR, num clique só.
///
/// Antes, aprovar só trocava um rótulo na tela: para a pessoa entrar de fato
/// alguém ainda tinha que ir ao Início, gerar um convite e lembrar de quem
/// era. O pedido ficava "aprovado" sem que ninguém tivesse sido liberado —
/// o tipo de lacuna que só aparece quando a pessoa reclama que não recebeu
/// nada.
///
/// Agora o mesmo clique cria o convite (de uso único, como qualquer outro) e
/// guarda no pedido qual convite foi gerado. Quem aprova vira o padrinho, e
/// o link aparece ali na hora, pronto pra mandar no contato que a pessoa
/// deixou no formulário.
export async function aprovarELiberar(formData: FormData) {
  const id = formData.get("id") as string;
  if (!id) return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  // Já aprovado e com convite: não gera outro. Dois links para a mesma
  // pessoa significam um deles morrendo sem uso e a dúvida de qual mandar.
  const { data: pedido } = await supabase
    .from("access_requests")
    .select("invite_id")
    .eq("id", id)
    .maybeSingle();
  if (pedido?.invite_id) {
    await supabase.from("access_requests").update({ status: "aprovado" }).eq("id", id);
    revalidatePath("/admin/solicitacoes");
    return;
  }

  const { data: convite, error } = await supabase
    .from("platform_invites")
    .insert({ inviter_id: user.id })
    .select("id")
    .single();
  if (error || !convite) return;

  await supabase
    .from("access_requests")
    .update({ status: "aprovado", invite_id: convite.id })
    .eq("id", id);

  revalidatePath("/admin/solicitacoes");
}
