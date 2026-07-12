import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ExperienceBadge } from "@/components/ExperienceBadge";
import { startGeneralConversation } from "./actions";

export default async function ComunidadePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; max_distance_km?: string }>;
}) {
  const { error, max_distance_km } = await searchParams;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: viewerProfile } = await supabase
    .from("users")
    .select("verification_badge_id, latitude")
    .eq("id", user.id)
    .single();

  if (!viewerProfile?.verification_badge_id) {
    return (
      <main className="mx-auto max-w-3xl px-6 py-16">
        <h1 className="text-2xl font-semibold">Comunidade</h1>
        <p className="mt-2 text-neutral-600">
          Sua verificação de identidade ainda não foi aprovada — isso é
          necessário para ver outros usuários da plataforma.
        </p>
      </main>
    );
  }

  const { data: people } = await supabase.rpc("browse_verified_users", {
    p_max_distance_km: max_distance_km ? Number(max_distance_km) : null,
  });

  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="text-2xl font-semibold">Comunidade</h1>
      <p className="mt-2 text-neutral-600">
        Outros usuários verificados da plataforma. Quem ativa o modo de
        navegação discreta no perfil não aparece aqui.
      </p>

      <form method="get" className="mt-4 flex items-center gap-2 text-sm">
        <label htmlFor="max_distance_km" className="text-neutral-500">
          Filtrar por distância
        </label>
        <select
          id="max_distance_km"
          name="max_distance_km"
          defaultValue={max_distance_km ?? ""}
          className="rounded border px-2 py-1"
        >
          <option value="">Qualquer distância</option>
          <option value="5">Até 5 km</option>
          <option value="25">Até 25 km</option>
          <option value="100">Até 100 km</option>
        </select>
        <button type="submit" className="rounded border px-3 py-1">
          Filtrar
        </button>
      </form>
      {!viewerProfile.latitude && (
        <p className="mt-2 text-xs text-neutral-500">
          Compartilhe sua localização em{" "}
          <Link href="/perfil" className="underline">
            /perfil
          </Link>{" "}
          para usar o filtro de distância.
        </p>
      )}

      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

      <ul className="mt-6 flex flex-col gap-2">
        {(people ?? []).map(
          (p: {
            id: string;
            name: string;
            profile_type: string;
            verification_badge_id: string;
            experience_level: string | null;
            distance_bucket: string | null;
          }) => (
            <li key={p.id} className="flex items-center gap-3 rounded-lg border p-3">
              <Link href={`/perfil/${p.id}`} className="font-medium underline">
                {p.name}
              </Link>
              <span className="text-sm text-neutral-500">{p.profile_type}</span>
              <ExperienceBadge level={p.experience_level} />
              {p.distance_bucket && (
                <span className="text-xs text-neutral-400">{p.distance_bucket}</span>
              )}
              <form action={startGeneralConversation} className="ml-auto">
                <input type="hidden" name="other_user_id" value={p.id} />
                <button type="submit" className="rounded border px-2 py-1 text-sm">
                  Conversar
                </button>
              </form>
            </li>
          ),
        )}
        {(people ?? []).length === 0 && (
          <p className="text-neutral-600">Nenhum outro usuário verificado ainda.</p>
        )}
      </ul>
    </main>
  );
}
