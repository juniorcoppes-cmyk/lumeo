import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ExperienceBadge } from "@/components/ExperienceBadge";
import { requestPhotoAccess } from "./actions";

export default async function OutroPerfilPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  if (id === user.id) {
    redirect("/perfil");
  }

  const { data: viewerProfile } = await supabase
    .from("users")
    .select("verification_badge_id")
    .eq("id", user.id)
    .single();

  if (!viewerProfile?.verification_badge_id) {
    return (
      <main className="mx-auto max-w-3xl px-6 py-16">
        <h1 className="text-2xl font-semibold">Perfil não disponível</h1>
        <p className="mt-2 text-neutral-600">
          Sua verificação de identidade ainda não foi aprovada — isso é
          necessário para ver o perfil de outros usuários.
        </p>
      </main>
    );
  }

  const { data: targetRows } = await supabase.rpc("get_verified_profile", {
    p_user_id: id,
  });
  const target = targetRows?.[0];

  if (!target) {
    return (
      <main className="mx-auto max-w-3xl px-6 py-16">
        <h1 className="text-2xl font-semibold">Perfil não disponível</h1>
        <p className="mt-2 text-neutral-600">
          Esse usuário não existe ou ainda não foi verificado.
        </p>
      </main>
    );
  }

  const { data: corpoPhotos } = await supabase
    .from("profile_photos")
    .select("id, storage_path")
    .eq("user_id", id)
    .eq("category", "corpo")
    .order("position", { ascending: true });

  const corpoWithUrls = await Promise.all(
    (corpoPhotos ?? []).map(async (photo) => {
      const { data } = await supabase.storage
        .from("profile-photos")
        .createSignedUrl(photo.storage_path, 300);
      return { ...photo, url: data?.signedUrl };
    }),
  );

  const { data: accessRequest } = await supabase
    .from("photo_access_requests")
    .select("status")
    .eq("requester_id", user.id)
    .eq("owner_id", id)
    .maybeSingle();

  let rostoWithUrls: { id: string; storage_path: string; url?: string }[] = [];
  if (accessRequest?.status === "approved") {
    const { data: rostoPhotos } = await supabase
      .from("profile_photos")
      .select("id, storage_path")
      .eq("user_id", id)
      .eq("category", "rosto")
      .order("position", { ascending: true });

    rostoWithUrls = await Promise.all(
      (rostoPhotos ?? []).map(async (photo) => {
        const { data } = await supabase.storage
          .from("profile-photos")
          .createSignedUrl(photo.storage_path, 300);
        return { ...photo, url: data?.signedUrl };
      }),
    );
  }

  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="text-2xl font-semibold">{target.name}</h1>
      <div className="mt-2 flex items-center gap-2 text-sm text-neutral-600">
        <span>{target.profile_type}</span>
        <ExperienceBadge level={target.experience_level} />
      </div>

      <section className="mt-8">
        <h2 className="text-lg font-medium">Fotos — Corpo</h2>
        <div className="mt-3 flex flex-wrap gap-3">
          {corpoWithUrls.map(
            (photo) =>
              photo.url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={photo.id}
                  src={photo.url}
                  alt=""
                  className="h-24 w-24 rounded object-cover"
                />
              ),
          )}
          {corpoWithUrls.length === 0 && (
            <p className="text-sm text-neutral-500">Nenhuma foto ainda.</p>
          )}
        </div>
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-medium">Fotos — Rosto</h2>

        {accessRequest?.status === "approved" ? (
          <div className="mt-3 flex flex-wrap gap-3">
            {rostoWithUrls.map(
              (photo) =>
                photo.url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={photo.id}
                    src={photo.url}
                    alt=""
                    className="h-24 w-24 rounded object-cover"
                  />
                ),
            )}
            {rostoWithUrls.length === 0 && (
              <p className="text-sm text-neutral-500">Nenhuma foto ainda.</p>
            )}
          </div>
        ) : accessRequest?.status === "pending" ? (
          <p className="mt-2 text-sm text-neutral-600">
            Pedido de acesso enviado — aguardando aprovação.
          </p>
        ) : (
          <div className="mt-2">
            {accessRequest?.status === "denied" && (
              <p className="text-sm text-red-600">Pedido anterior negado.</p>
            )}
            <form action={requestPhotoAccess} className="mt-2">
              <input type="hidden" name="owner_id" value={id} />
              <button type="submit" className="rounded border px-3 py-1.5 text-sm">
                Solicitar acesso
              </button>
            </form>
          </div>
        )}
      </section>
    </main>
  );
}
