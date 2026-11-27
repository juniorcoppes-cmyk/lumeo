"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

// Teto do arquivo que sobe no grupo. A foto já vem comprimida do navegador;
// acima disso é quase certo que algo deu errado no caminho.
const MAX_PHOTO_BYTES = 8 * 1024 * 1024;

// Chat de grupo do evento. As regras de "quem pode ler/escrever" moram no RLS
// da tabela event_messages (só membro do evento, só em nome próprio, e casal
// precisa marcar quem falou), então aqui é só repassar — se a pessoa não for
// do grupo, o insert é barrado no banco.
export async function enviarMensagemGrupo(formData: FormData) {
  const eventId = formData.get("event_id") as string;
  const content = (formData.get("content") as string)?.trim() ?? "";
  const personaRaw = formData.get("persona") as string | null;
  // Só 'p1'/'p2' valem; qualquer outra coisa vira null (conta individual).
  const persona = personaRaw === "p1" || personaRaw === "p2" ? personaRaw : null;

  const foto = formData.get("photo");
  const temFoto = foto instanceof File && foto.size > 0;
  const modoRaw = formData.get("photo_mode") as string | null;
  // No grupo só existe 'fixa' e 'temporaria' (sem visualização única).
  const photoMode = modoRaw === "temporaria" ? "temporaria" : "fixa";

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
        `/eventos/${eventId}/grupo?error=${encodeURIComponent("Essa foto é grande demais. Tente outra.")}`,
      );
    }
    const ext = (foto.name.split(".").pop() ?? "jpg").toLowerCase().slice(0, 5);
    photoPath = `${user.id}/grupo/${crypto.randomUUID()}.${ext}`;
    const { error: erroUpload } = await supabase.storage
      .from("profile-photos")
      .upload(photoPath, foto);
    if (erroUpload) {
      redirect(`/eventos/${eventId}/grupo?error=${encodeURIComponent(erroUpload.message)}`);
    }
  }

  const { error } = await supabase.from("event_messages").insert({
    event_id: eventId,
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
    redirect(`/eventos/${eventId}/grupo?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath(`/eventos/${eventId}/grupo`);
}

export async function editarMensagemGrupo(formData: FormData) {
  const eventId = formData.get("event_id") as string;
  const messageId = formData.get("message_id") as string;
  const content = (formData.get("content") as string)?.trim();
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  if (!content) return;

  // O RLS (sender_id = auth.uid()) garante que ninguém edita a mensagem de
  // outro; o filtro aqui é só defensivo.
  await supabase
    .from("event_messages")
    .update({ content, edited_at: new Date().toISOString() })
    .eq("id", messageId)
    .eq("sender_id", user.id)
    .is("deleted_at", null);

  revalidatePath(`/eventos/${eventId}/grupo`);
}

export async function excluirMensagemGrupo(formData: FormData) {
  const eventId = formData.get("event_id") as string;
  const messageId = formData.get("message_id") as string;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Se a mensagem tinha foto, lê o caminho antes de apagar pra remover o
  // arquivo do storage (senão ficaria órfão).
  const { data: msg } = await supabase
    .from("event_messages")
    .select("photo_path")
    .eq("id", messageId)
    .eq("sender_id", user.id)
    .maybeSingle();

  // Exclusão é "soft": marca a hora e apaga o texto, pra conversa não ficar
  // com buraco mas o conteúdo sumir de verdade.
  await supabase
    .from("event_messages")
    .update({ deleted_at: new Date().toISOString(), content: "" })
    .eq("id", messageId)
    .eq("sender_id", user.id);

  if (msg?.photo_path) {
    await supabase.storage.from("profile-photos").remove([msg.photo_path]);
  }

  revalidatePath(`/eventos/${eventId}/grupo`);
}
