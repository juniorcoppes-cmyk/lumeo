import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ExperienceBadge } from "@/components/ExperienceBadge";
import { EXPERIENCE_LEVEL_LABELS, EXPERIENCE_LEVELS } from "@/lib/experience-level";
import { startGeneralConversation } from "./actions";

export default async function ComunidadePage({
  searchParams,
}: {
  searchParams: Promise<{
    error?: string;
    max_distance_km?: string;
    profile_filter?: string;
    experience_level?: string;
  }>;
}) {
  const { error, max_distance_km, profile_filter, experience_level } = await searchParams;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: viewerProfile } = await supabase
    .from("users")
    .select("verification_badge_id, latitude, is_admin, is_support_channel")
    .eq("id", user.id)
    .single();

  const viewerCanBrowse =
    !!viewerProfile?.verification_badge_id ||
    !!viewerProfile?.is_admin ||
    !!viewerProfile?.is_support_channel;

  if (!viewerCanBrowse) {
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
    p_profile_filter: profile_filter || null,
    p_experience_level: experience_level || null,
  });

  const peopleWithAvatars = await Promise.all(
    (people ?? []).map(async (p: { id: string; avatar_path: string | null }) => {
      if (!p.avatar_path) return { ...p, avatarUrl: undefined };
      const { data } = await supabase.storage
        .from("profile-photos")
        .createSignedUrl(p.avatar_path, 300);
      return { ...p, avatarUrl: data?.signedUrl };
    }),
  );

  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="text-2xl font-semibold">Comunidade</h1>
      <p className="mt-2 text-neutral-600">
        Outros usuários verificados da plataforma. Quem ativa o modo de
        navegação discreta no perfil não aparece aqui.
      </p>

      <form
        method="get"
        className="mt-4 grid grid-cols-2 gap-3 rounded-lg border p-4 text-sm sm:grid-cols-4 sm:items-end"
      >
        <label className="flex flex-col gap-1">
          <span className="text-xs text-neutral-500">Perfil</span>
          <select
            name="profile_filter"
            defaultValue={profile_filter ?? ""}
            className="rounded border px-2 py-1.5"
          >
            <option value="">Todos</option>
            <option value="casais">Casais</option>
            <option value="homens">Homens</option>
            <option value="mulheres">Mulheres</option>
          </select>
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-xs text-neutral-500">Experiência</span>
          <select
            name="experience_level"
            defaultValue={experience_level ?? ""}
            className="rounded border px-2 py-1.5"
          >
            <option value="">Todas</option>
            {EXPERIENCE_LEVELS.map((level) => (
              <option key={level} value={level}>
                {EXPERIENCE_LEVEL_LABELS[level]}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-xs text-neutral-500">Distância</span>
          <select
            name="max_distance_km"
            defaultValue={max_distance_km ?? ""}
            className="rounded border px-2 py-1.5"
          >
            <option value="">Qualquer</option>
            <option value="5">Até 5 km</option>
            <option value="25">Até 25 km</option>
            <option value="100">Até 100 km</option>
          </select>
        </label>

        <button type="submit" className="rounded bg-black px-3 py-1.5 text-white">
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
        {peopleWithAvatars.map(
          (p: {
            id: string;
            name: string;
            profile_type: string;
            verification_badge_id: string;
            experience_level: string | null;
            distance_bucket: string | null;
            avatarUrl?: string;
          }) => (
            <li key={p.id} className="flex items-center gap-3 rounded-lg border p-3">
              {p.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={p.avatarUrl}
                  alt=""
                  className="h-10 w-10 rounded-full object-cover"
                />
              ) : (
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-neutral-100 text-[10px] text-neutral-500">
                  Sem foto
                </div>
              )}
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
        {peopleWithAvatars.length === 0 && (
          <p className="text-neutral-600">Nenhum outro usuário verificado ainda.</p>
        )}
      </ul>
    </main>
  );
}
