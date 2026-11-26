"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

// Teto do arquivo que sobe no chat. A foto já vem comprimida do navegador;
// acima disso é quase certo que algo deu errado no caminho.
const MAX_PHOTO_BYTES = 8 * 1024 * 1024;

export async function sendMessage(formData: FormData) {
  const conversationId = formData.get("conversation_id") as string;
  const content = (formData.get("content") as string)?.trim() ?? "";
  const personaRaw = formData.get("persona") as string | null;
  // Só 'p1'/'p2' valem; qualquer outra coisa vira null (conta individual).
  const persona = personaRaw === "p1" || personaRaw === "p2" ? personaRaw : null;

  const foto = formData.get("photo");
  const temFoto = foto instanceof File && foto.size > 0;
  const modoRaw = formData.get("photo_mode") as string | null;
  const photoMode =
    modoRaw === "fixa" || modoRaw === "temporaria" || modoRaw === "unica" ? modoRaw : "fixa";

  // Mensagem vazia não existe: ou tem texto, ou tem foto.
  if (!content && !temFoto) return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  let photoPath: string | null = null;
  if (temFoto) {
    if (foto.size > MAX_PHOTO_BYTES) {
      redirect(
        `/chat/${conversationId}?error=${encodeURIComponent("Essa foto é grande demais. Tente outra.")}`,
      );
    }
    const ext = (foto.name.split(".").pop() ?? "jpg").toLowerCase().slice(0, 5);
    photoPath = `${user.id}/chat/${crypto.randomUUID()}.${ext}`;
    const { error: erroUpload } = await supabase.storage
      .from("profile-photos")
      .upload(photoPath, foto);
    if (erroUpload) {
      redirect(`/chat/${conversationId}?error=${encodeURIComponent(erroUpload.message)}`);
    }
  }

  const { error } = await supabase.from("messages").insert({
    conversation_id: conversationId,
    sender_id: user.id,
    content,
    sender_persona: persona,
    photo_path: photoPath,
    photo_mode: temFoto ? photoMode : null,
    photo_expires_at:
      temFoto && photoMode === "temporaria"
        ? new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
        : null,
  });

  if (error) {
    // Mensagem que não gravou deixaria o arquivo órfão no storage.
    if (photoPath) await supabase.storage.from("profile-photos").remove([photoPath]);
    // A RLS de insert não propaga o texto do erro, então perguntamos ao banco
    // qual é o motivo real do bloqueio. Se não for bloqueio de contato (motivo
    // null), o problema é outro — antes o código culpava o fim do teste em
    // QUALQUER falha, o que mentia pra quem só esbarrou noutro erro.
    const { data: motivo } = await supabase.rpc("contact_block_reason", {
      p_user_id: user.id,
    });
    redirect(
      `/chat/${conversationId}?error=${encodeURIComponent(
        (motivo as string | null) ?? "Não consegui enviar sua mensagem. Tente de novo.",
      )}`,
    );
  }

  revalidatePath(`/chat/${conversationId}`);
}

export async function editMessage(formData: FormData) {
  const conversationId = formData.get("conversation_id") as string;
  const messageId = formData.get("message_id") as string;
  const content = (formData.get("content") as string)?.trim();

  if (!content) return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // `eq("sender_id", user.id)` é defesa em profundidade, não a trava: quem
  // barra de verdade é o trigger `protect_message_content` no banco, que
  // vale inclusive pra quem chamar a API direto, sem passar por aqui.
  // `edited_at` não vai daqui de propósito — é o banco que carimba.
  const { error } = await supabase
    .from("messages")
    .update({ content })
    .eq("id", messageId)
    .eq("sender_id", user.id);

  if (error) {
    redirect(
      `/chat/${conversationId}?error=${encodeURIComponent(
        "Não consegui editar sua mensagem. Tente de novo.",
      )}`,
    );
  }

  revalidatePath(`/chat/${conversationId}`);
}

export async function deleteMessage(formData: FormData) {
  const conversationId = formData.get("conversation_id") as string;
  const messageId = formData.get("message_id") as string;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Se a mensagem tinha foto, lê o caminho antes de apagar pra remover o
  // arquivo do storage (senão ficaria órfão).
  const { data: msg } = await supabase
    .from("messages")
    .select("photo_path")
    .eq("id", messageId)
    .eq("sender_id", user.id)
    .maybeSingle();

  // Só marca a exclusão — é o trigger que arquiva o texto em
  // `deleted_message_contents` (prova pra denúncia, só admin lê) e limpa o
  // conteúdo da linha, pra que o outro participante não consiga ler o texto
  // "apagado" pela API.
  const { error } = await supabase
    .from("messages")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", messageId)
    .eq("sender_id", user.id);

  if (error) {
    redirect(
      `/chat/${conversationId}?error=${encodeURIComponent(
        "Não consegui excluir sua mensagem. Tente de novo.",
      )}`,
    );
  }

  if (msg?.photo_path) {
    await supabase.storage.from("profile-photos").remove([msg.photo_path]);
  }

  revalidatePath(`/chat/${conversationId}`);
}

// Revela a foto de visualização única pro destinatário: gera a URL assinada
// ANTES de marcar como vista (depois a policy do storage já nega) e devolve a
// URL pro cliente mostrar uma vez. O próprio autor não passa por aqui — ele vê
// a própria foto pela policy "select own".
export async function revelarFotoUnica(messageId: string): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: msg } = await supabase
    .from("messages")
    .select("conversation_id, sender_id, photo_path, photo_mode, photo_viewed_at")
    .eq("id", messageId)
    .maybeSingle();

  if (
    !msg ||
    msg.photo_mode !== "unica" ||
    msg.photo_viewed_at ||
    !msg.photo_path ||
    msg.sender_id === user.id
  ) {
    return null;
  }

  const { data: signed } = await supabase.storage
    .from("profile-photos")
    .createSignedUrl(msg.photo_path, 300);
  if (!signed?.signedUrl) return null;

  await supabase.rpc("marcar_foto_unica_vista", { p_message_id: messageId });
  revalidatePath(`/chat/${msg.conversation_id}`);
  return signed.signedUrl;
}
