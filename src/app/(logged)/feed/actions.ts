"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

/// Teto do arquivo que sobe no post. A foto já vem comprimida e cortada do
/// editor; acima disso é quase certo que algo deu errado no caminho.
const MAX_BYTES = 8 * 1024 * 1024;

export async function publicarNoFeed(formData: FormData) {
  const content = ((formData.get("content") as string) ?? "").trim();
  const foto = formData.get("photo");
  const temFoto = foto instanceof File && foto.size > 0;

  // Publicação vazia não existe: ou tem texto, ou tem foto.
  if (!content && !temFoto) return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  if (!temFoto) {
    await supabase.from("timeline_posts").insert({
      user_id: user.id,
      type: "text",
      content,
    });
    revalidatePath("/feed");
    return;
  }

  if (foto.size > MAX_BYTES) {
    redirect(`/feed?erro=${encodeURIComponent("Essa foto é grande demais. Tente outra.")}`);
  }

  // O caminho é <uid>/feed/<arquivo>: é por esse "feed" no meio que a policy
  // do storage reconhece a foto como pública para os verificados.
  const ext = (foto.name.split(".").pop() ?? "jpg").toLowerCase().slice(0, 5);
  const path = `${user.id}/feed/${crypto.randomUUID()}.${ext}`;

  const { error: erroUpload } = await supabase.storage
    .from("profile-photos")
    .upload(path, foto);
  if (erroUpload) {
    redirect(`/feed?erro=${encodeURIComponent(erroUpload.message)}`);
  }

  const { error: erroPost } = await supabase.from("timeline_posts").insert({
    user_id: user.id,
    type: "photo",
    content: content || null,
    photo_path: path,
  });
  // Post que não gravou deixaria o arquivo órfão no storage, pago e invisível.
  if (erroPost) {
    await supabase.storage.from("profile-photos").remove([path]);
    redirect(`/feed?erro=${encodeURIComponent("Não consegui publicar. Tente de novo.")}`);
  }

  revalidatePath("/feed");
  revalidatePath("/inicio");
}

export async function apagarDoFeed(formData: FormData) {
  const postId = formData.get("post_id") as string;
  if (!postId) return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Lê o caminho antes de apagar a linha — depois não haveria como saber qual
  // arquivo remover. O .eq("user_id") é o que impede apagar post de outro
  // (a RLS também barra, mas a regra fica explícita aqui).
  const { data: post } = await supabase
    .from("timeline_posts")
    .select("photo_path")
    .eq("id", postId)
    .eq("user_id", user.id)
    .maybeSingle();

  await supabase.from("timeline_posts").delete().eq("id", postId).eq("user_id", user.id);

  if (post?.photo_path) {
    await supabase.storage.from("profile-photos").remove([post.photo_path]);
  }

  revalidatePath("/feed");
  revalidatePath("/inicio");
}
