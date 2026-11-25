import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getUser } from "@/lib/supabase/get-user";
import { AfinidadeForm } from "@/components/AfinidadeForm";
import type { Affinity } from "@/lib/affinity";

export default async function AfinidadePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const supabase = await createClient();

  const {
    data: { user },
  } = await getUser();
  if (!user) redirect("/login");

  const { data } = await supabase
    .from("profile_affinity")
    .select("interests, pace, settings")
    .eq("user_id", user.id)
    .maybeSingle();

  const current: Affinity = {
    interests: data?.interests ?? [],
    pace: data?.pace ?? null,
    settings: data?.settings ?? [],
  };

  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <Link href="/perfil" className="text-sm text-muted no-underline hover:text-accent">
        ← Meu perfil
      </Link>
      <h1 className="mt-1 text-2xl">Afinidade</h1>
      <p className="mt-2 text-sm text-muted">
        É com isso que a gente mostra quem combina com vocês — por interesse e
        sintonia, não por foto. Nada aqui é obrigatório, e você pode mudar quando
        quiser.
      </p>

      {error && <p className="mt-4 text-sm text-red-400">{error}</p>}

      <AfinidadeForm current={current} />
    </main>
  );
}
