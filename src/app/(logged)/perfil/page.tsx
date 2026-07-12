import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  deletePhoto,
  respondPhotoRequest,
  toggleDiscreetMode,
  uploadPhoto,
} from "./actions";

export default async function PerfilPage({
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

  const { data: profile } = await supabase
    .from("users")
    .select("name, email, profile_type, verification_badge_id, discreet_mode")
    .eq("id", user.id)
    .single();

  const { data: subscription } = await supabase
    .from("subscriptions")
    .select("plan, status")
    .eq("user_id", user.id)
    .maybeSingle();

  const { data: photos } = await supabase
    .from("profile_photos")
    .select("id, category, storage_path")
    .eq("user_id", user.id)
    .order("position", { ascending: true });

  const photosWithUrls = await Promise.all(
    (photos ?? []).map(async (photo) => {
      const { data } = await supabase.storage
        .from("profile-photos")
        .createSignedUrl(photo.storage_path, 300);
      return { ...photo, url: data?.signedUrl };
    }),
  );

  const rostoPhotos = photosWithUrls.filter((p) => p.category === "rosto");
  const corpoPhotos = photosWithUrls.filter((p) => p.category === "corpo");

  const { data: pendingRequests } = await supabase
    .from("photo_access_requests")
    .select("id, requester_id, users!requester_id(name)")
    .eq("owner_id", user.id)
    .eq("status", "pending");

  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="text-2xl font-semibold">Perfil</h1>

      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

      <dl className="mt-6 flex flex-col gap-2 text-sm">
        <div>
          <dt className="text-neutral-500">Nome</dt>
          <dd>{profile?.name}</dd>
        </div>
        <div>
          <dt className="text-neutral-500">E-mail</dt>
          <dd>{profile?.email}</dd>
        </div>
        <div>
          <dt className="text-neutral-500">Perfil</dt>
          <dd>{profile?.profile_type}</dd>
        </div>
        <div>
          <dt className="text-neutral-500">Selo de verificação</dt>
          <dd>{profile?.verification_badge_id ?? "Ainda não emitido"}</dd>
        </div>
        <div>
          <dt className="text-neutral-500">Plano atual</dt>
          <dd>{subscription ? `${subscription.plan} (${subscription.status})` : "Nenhum plano ativo"}</dd>
        </div>
      </dl>

      <form action={toggleDiscreetMode} className="mt-8 flex items-center gap-2">
        <input
          type="checkbox"
          id="discreet_mode"
          name="discreet_mode"
          defaultChecked={profile?.discreet_mode ?? false}
        />
        <label htmlFor="discreet_mode" className="text-sm">
          Modo de navegação discreta
        </label>
        <button type="submit" className="ml-4 rounded border px-3 py-1 text-sm">
          Salvar
        </button>
      </form>

      {pendingRequests && pendingRequests.length > 0 && (
        <section className="mt-10 border-t pt-6">
          <h2 className="text-lg font-medium">Pedidos de acesso ao seu álbum de rosto</h2>
          <ul className="mt-3 flex flex-col gap-2">
            {pendingRequests.map((req) => {
              const requester = Array.isArray(req.users) ? req.users[0] : req.users;
              return (
                <li key={req.id} className="flex items-center gap-3 text-sm">
                  <span>{requester?.name}</span>
                  <form action={respondPhotoRequest}>
                    <input type="hidden" name="request_id" value={req.id} />
                    <input type="hidden" name="decision" value="approved" />
                    <button type="submit" className="rounded border px-2 py-1">
                      Aprovar
                    </button>
                  </form>
                  <form action={respondPhotoRequest}>
                    <input type="hidden" name="request_id" value={req.id} />
                    <input type="hidden" name="decision" value="denied" />
                    <button type="submit" className="rounded border px-2 py-1">
                      Negar
                    </button>
                  </form>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <section className="mt-10 border-t pt-6">
        <h2 className="text-lg font-medium">Fotos — Rosto</h2>
        <p className="text-sm text-neutral-500">
          Só fica visível para quem você aprovar um pedido de acesso.
        </p>
        <div className="mt-3 flex flex-wrap gap-3">
          {rostoPhotos.map((photo) => (
            <div key={photo.id} className="flex flex-col items-center gap-1">
              {photo.url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={photo.url} alt="" className="h-24 w-24 rounded object-cover" />
              )}
              <form action={deletePhoto}>
                <input type="hidden" name="photo_id" value={photo.id} />
                <input type="hidden" name="storage_path" value={photo.storage_path} />
                <button type="submit" className="text-xs text-red-600 underline">
                  Remover
                </button>
              </form>
            </div>
          ))}
        </div>
        <form action={uploadPhoto} className="mt-3 flex items-center gap-2">
          <input type="hidden" name="category" value="rosto" />
          <input type="file" name="photo" accept="image/*" required />
          <button type="submit" className="rounded border px-3 py-1.5 text-sm">
            Adicionar
          </button>
        </form>
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-medium">Fotos — Corpo</h2>
        <p className="text-sm text-neutral-500">
          Visível para qualquer usuário verificado.
        </p>
        <div className="mt-3 flex flex-wrap gap-3">
          {corpoPhotos.map((photo) => (
            <div key={photo.id} className="flex flex-col items-center gap-1">
              {photo.url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={photo.url} alt="" className="h-24 w-24 rounded object-cover" />
              )}
              <form action={deletePhoto}>
                <input type="hidden" name="photo_id" value={photo.id} />
                <input type="hidden" name="storage_path" value={photo.storage_path} />
                <button type="submit" className="text-xs text-red-600 underline">
                  Remover
                </button>
              </form>
            </div>
          ))}
        </div>
        <form action={uploadPhoto} className="mt-3 flex items-center gap-2">
          <input type="hidden" name="category" value="corpo" />
          <input type="file" name="photo" accept="image/*" required />
          <button type="submit" className="rounded border px-3 py-1.5 text-sm">
            Adicionar
          </button>
        </form>
      </section>
    </main>
  );
}
