import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { uploadDocumento } from "./actions";

export default async function CadastroDocumentoPage({
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
      <h1 className="text-2xl">Envio de documento</h1>
      <p className="mt-2 text-sm text-muted">Etapa 2 de 4</p>
      {error && <p className="mt-4 text-sm text-red-400">{error}</p>}
      <form action={uploadDocumento} className="mt-6 flex flex-col gap-4">
        <input type="file" name="documento" accept="image/*,.pdf" required />
        <button type="submit" className="btn-primary">
          Continuar
        </button>
      </form>
    </main>
  );
}
