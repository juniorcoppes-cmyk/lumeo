"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

/// Curtir e descurtir no mesmo botão: o estado é a existência da linha.
export async function alternarCurtida(formData: FormData) {
  const postId = formData.get("post_id") as string;
  if (!postId) return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: existente } = await supabase
    .from("post_likes")
    .select("post_id")
    .eq("post_id", postId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (existente) {
    await supabase.from("post_likes").delete().eq("post_id", postId).eq("user_id", user.id);
  } else {
    await supabase.from("post_likes").insert({ post_id: postId, user_id: user.id });
  }

  revalidatePath("/feed");
}

export async function comentarNoPost(formData: FormData) {
  const postId = formData.get("post_id") as string;
  const content = ((formData.get("content") as string) ?? "").trim().slice(0, 1000);
  // Resposta a outro comentário; vazio = comentário solto.
  const replyTo = ((formData.get("reply_to") as string) ?? "").trim() || null;
  if (!postId || !content) return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Quem não pode responder é barrado pela RLS, não aqui: a regra mora num
  // lugar só, e no banco ninguém dribla mandando o formulário na mão.
  const { error } = await supabase.from("post_comments").insert({
    post_id: postId,
    author_id: user.id,
    content,
    reply_to: replyTo,
  });

  if (error) {
    redirect(
      `/feed?erro=${encodeURIComponent("Não consegui publicar o comentário. Tente de novo.")}`,
    );
  }

  revalidatePath("/feed");
}

export async function apagarComentario(formData: FormData) {
  const id = formData.get("comment_id") as string;
  if (!id) return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Sem filtro de autor aqui de propósito: a RLS deixa apagar o próprio
  // comentário E qualquer um no seu post. Filtrar por author_id aqui tiraria
  // do dono da foto o poder de limpar o que não quer ver.
  await supabase.from("post_comments").delete().eq("id", id);

  revalidatePath("/feed");
}
