"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

const MAX_BYTES = 8 * 1024 * 1024;

/// Publica um story. Vive 24 horas — não existe campo de validade: quem
/// decide é o `created_at` na hora da leitura (get_stories). Assim não há
/// relógio pra desencontrar, e um story nunca "esquece" de sumir.
///
/// SEM LIMITE DIÁRIO, de propósito (decisão do dono, 26/11/2026): o CRS
/// deixa uma foto por dia, e isso é exatamente o tipo de freio que faz a
/// pessoa parar de postar e o feed morrer.
export async function publicarStory(formData: FormData) {
  const foto = formData.get("photo");
  if (!(foto instanceof File) || foto.size === 0) return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  if (foto.size > MAX_BYTES) {
    redirect(`/feed?erro=${encodeURIComponent("Essa foto é grande demais. Tente outra.")}`);
  }

  const caption = ((formData.get("caption") as string) ?? "").trim().slice(0, 200);
  const ext = (foto.name.split(".").pop() ?? "jpg").toLowerCase().slice(0, 5);
  const path = `${user.id}/story/${crypto.randomUUID()}.${ext}`;

  const { error: erroUpload } = await supabase.storage
    .from("profile-photos")
    .upload(path, foto);
  if (erroUpload) {
    redirect(`/feed?erro=${encodeURIComponent(erroUpload.message)}`);
  }

  const { error: erroStory } = await supabase.from("stories").insert({
    user_id: user.id,
    photo_path: path,
    caption: caption || null,
  });
  if (erroStory) {
    await supabase.storage.from("profile-photos").remove([path]);
    redirect(`/feed?erro=${encodeURIComponent("Não consegui publicar o story. Tente de novo.")}`);
  }

  revalidatePath("/feed");
}

export async function apagarStory(formData: FormData) {
  const id = formData.get("story_id") as string;
  if (!id) return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: story } = await supabase
    .from("stories")
    .select("photo_path")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  await supabase.from("stories").delete().eq("id", id).eq("user_id", user.id);
  if (story?.photo_path) {
    await supabase.storage.from("profile-photos").remove([story.photo_path]);
  }

  revalidatePath("/feed");
}
