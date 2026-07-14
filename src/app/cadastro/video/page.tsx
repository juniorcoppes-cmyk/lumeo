import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { uploadVideo } from "./actions";

export default async function CadastroVideoPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return (
    <main className="mx-auto max-w-sm px-6 py-16">
      <h1 className="text-2xl">Vídeo de verificação</h1>
      <p className="mt-2 text-sm text-muted">Etapa 3 de 4</p>
      {error && <p className="mt-4 text-sm text-red-400">{error}</p>}
      <form action={uploadVideo} className="mt-6 flex flex-col gap-4">
        <input type="file" name="video" accept="video/*" required />
        <button type="submit" className="btn-primary">
          Continuar
        </button>
      </form>
    </main>
  );
}
