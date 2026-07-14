import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { setPadrinho } from "./actions";

export default async function CadastroPadrinhoPage({
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
      <h1 className="text-2xl">Indicação de padrinho</h1>
      <p className="mt-2 text-sm text-muted">Etapa 4 de 4 (opcional)</p>
      {error && <p className="mt-4 text-sm text-red-400">{error}</p>}
      <form action={setPadrinho} className="mt-6 flex flex-col gap-4">
        <input
          type="text"
          name="badge_id"
          placeholder="Selo do padrinho (opcional)"
          className="input"
        />
        <button type="submit" className="btn-primary">
          Finalizar cadastro
        </button>
      </form>
    </main>
  );
}
