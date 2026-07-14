import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { EXPERIENCE_LEVEL_LABELS, EXPERIENCE_LEVELS } from "@/lib/experience-level";
import {
  formatBirthDateForInput,
  GENDER_LABELS,
  GENDER_OPTIONS,
  LOOKING_FOR_LABELS,
  LOOKING_FOR_OPTIONS,
  ORIENTATION_LABELS,
  ORIENTATION_OPTIONS,
} from "@/lib/profile-options";
import { PhotoGallery } from "@/components/PhotoGallery";
import { PinSettings } from "@/components/PinSettings";
import { LocationShareButton } from "./LocationShareButton";
import {
  clearLocation,
  deletePhoto,
  removeAvatar,
  respondPhotoRequest,
  toggleCoupleSingleDevice,
  toggleDiscreetMode,
  updateAvatar,
  updateExperienceLevel,
  updateProfileDetails,
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
    .select(
      "name, email, profile_type, verification_badge_id, discreet_mode, couple_single_device, experience_level, location_updated_at, bio, birth_date, gender, sexual_orientation, looking_for, partner_birth_date, partner_gender, partner_sexual_orientation, avatar_path",
    )
    .eq("id", user.id)
    .single();

  const avatarUrl = profile?.avatar_path
    ? (
        await supabase.storage
          .from("profile-photos")
          .createSignedUrl(profile.avatar_path, 300)
      ).data?.signedUrl
    : undefined;

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

  const photoIds = photosWithUrls.map((p) => p.id);
  const { data: comments } = photoIds.length
    ? await supabase
        .from("photo_comments")
        .select("id, photo_id, author_id, content, created_at, users!author_id(name)")
        .in("photo_id", photoIds)
        .order("created_at", { ascending: true })
    : { data: [] };

  const commentsByPhoto: Record<
    string,
    { id: string; author_id: string; author_name: string; content: string; created_at: string }[]
  > = {};
  for (const c of comments ?? []) {
    const author = Array.isArray(c.users) ? c.users[0] : c.users;
    (commentsByPhoto[c.photo_id] ??= []).push({
      id: c.id,
      author_id: c.author_id,
      author_name: author?.name ?? "",
      content: c.content,
      created_at: c.created_at,
    });
  }

  const [{ data: likeCounts }, { data: myLikes }] = photoIds.length
    ? await Promise.all([
        supabase.rpc("get_photo_like_counts", { p_photo_ids: photoIds }),
        supabase.from("photo_likes").select("photo_id").eq("user_id", user.id).in("photo_id", photoIds),
      ])
    : [{ data: [] }, { data: [] }];

  const myLikedPhotoIds = new Set((myLikes ?? []).map((l) => l.photo_id));
  const likesByPhoto: Record<string, { count: number; likedByMe: boolean }> = {};
  for (const id of photoIds) {
    likesByPhoto[id] = {
      count: Number(
        likeCounts?.find((l: { photo_id: string }) => l.photo_id === id)?.like_count ?? 0,
      ),
      likedByMe: myLikedPhotoIds.has(id),
    };
  }

  const { data: pendingRequests } = await supabase
    .from("photo_access_requests")
    .select("id, requester_id, users!requester_id(name)")
    .eq("owner_id", user.id)
    .eq("status", "pending");

  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="text-2xl font-semibold">Perfil</h1>

      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

      <div className="mt-4 flex items-center gap-4">
        {avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={avatarUrl}
            alt=""
            className="h-20 w-20 rounded-full object-cover"
          />
        ) : (
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-neutral-100 text-xs text-neutral-500">
            Sem foto
          </div>
        )}
        <div className="flex flex-col gap-2">
          <form action={updateAvatar} className="flex items-center gap-2">
            <input type="file" name="avatar" accept="image/*" required className="text-sm" />
            <button type="submit" className="rounded border px-3 py-1 text-sm">
              {avatarUrl ? "Trocar" : "Adicionar"}
            </button>
          </form>
          {avatarUrl && (
            <form action={removeAvatar}>
              <button type="submit" className="text-xs text-red-600 underline">
                Remover foto de perfil
              </button>
            </form>
          )}
          <p className="text-xs text-neutral-500">
            Visível para qualquer usuário verificado, na Comunidade, na linha
            do tempo e no seu perfil.
          </p>
        </div>
      </div>

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

      {profile?.profile_type === "casal" && (
        <div className="mt-4">
          <form action={toggleCoupleSingleDevice} className="flex items-center gap-2">
            <input
              type="checkbox"
              id="couple_single_device"
              name="couple_single_device"
              defaultChecked={profile?.couple_single_device ?? false}
            />
            <label htmlFor="couple_single_device" className="text-sm">
              Vocês dois acessam o Lumeo pelo mesmo celular
            </label>
            <button type="submit" className="ml-4 rounded border px-3 py-1 text-sm">
              Salvar
            </button>
          </form>
          <p className="mt-1 text-xs text-neutral-500">
            Sem marcar isso, uma mensagem só sai do negrito quando os dois
            aparelhos do casal confirmarem a leitura — se vocês usam sempre
            o mesmo celular, marque aqui pra bastar 1.
          </p>
        </div>
      )}

      <PinSettings />

      <form action={updateExperienceLevel} className="mt-4 flex items-center gap-2">
        <label htmlFor="experience_level" className="text-sm text-neutral-500">
          Experiência no meio liberal
        </label>
        <select
          id="experience_level"
          name="experience_level"
          defaultValue={profile?.experience_level ?? ""}
          className="rounded border px-2 py-1 text-sm"
        >
          <option value="" disabled>
            Selecione
          </option>
          {EXPERIENCE_LEVELS.map((level) => (
            <option key={level} value={level}>
              {EXPERIENCE_LEVEL_LABELS[level]}
            </option>
          ))}
        </select>
        <button type="submit" className="rounded border px-3 py-1 text-sm">
          Salvar
        </button>
      </form>

      <div className="mt-4 flex items-center gap-3">
        <span className="text-sm text-neutral-500">
          {profile?.location_updated_at
            ? `Localização compartilhada (atualizada em ${new Date(
                profile.location_updated_at,
              ).toLocaleDateString("pt-BR")})`
            : "Localização não compartilhada"}
        </span>
        <LocationShareButton />
        {profile?.location_updated_at && (
          <form action={clearLocation}>
            <button type="submit" className="text-xs text-red-600 underline">
              Remover
            </button>
          </form>
        )}
      </div>
      <p className="mt-1 text-xs text-neutral-500">
        Usada só para mostrar uma faixa de distância aproximada na
        Comunidade (ex.: &quot;5–25 km&quot;) — nunca a distância exata nem
        sua localização precisa.
      </p>

      <section className="mt-10 border-t pt-6">
        <h2 className="text-lg font-medium">Detalhes do perfil</h2>
        <form action={updateProfileDetails} className="mt-3 flex flex-col gap-3 text-sm">
          <label className="flex flex-col gap-1">
            Descrição
            <textarea
              name="bio"
              rows={3}
              defaultValue={profile?.bio ?? ""}
              className="rounded border px-3 py-2"
            />
          </label>

          <label className="flex flex-col gap-1">
            {profile?.profile_type === "casal" ? "Data de nascimento (1)" : "Data de nascimento"}
            <input
              type="text"
              inputMode="numeric"
              name="birth_date"
              placeholder="DD/MM/AAAA"
              pattern="\d{2}/\d{2}/\d{4}"
              defaultValue={formatBirthDateForInput(profile?.birth_date)}
              className="rounded border px-3 py-2"
            />
          </label>

          <label className="flex flex-col gap-1">
            {profile?.profile_type === "casal" ? "Sexo (1)" : "Sexo"}
            <select
              name="gender"
              defaultValue={profile?.gender ?? ""}
              className="rounded border px-3 py-2"
            >
              <option value="">Selecione</option>
              {GENDER_OPTIONS.map((g) => (
                <option key={g} value={g}>
                  {GENDER_LABELS[g]}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1">
            {profile?.profile_type === "casal" ? "Orientação sexual (1)" : "Orientação sexual"}
            <select
              name="sexual_orientation"
              defaultValue={profile?.sexual_orientation ?? ""}
              className="rounded border px-3 py-2"
            >
              <option value="">Selecione</option>
              {ORIENTATION_OPTIONS.map((o) => (
                <option key={o} value={o}>
                  {ORIENTATION_LABELS[o]}
                </option>
              ))}
            </select>
          </label>

          {profile?.profile_type === "casal" && (
            <>
              <label className="flex flex-col gap-1">
                Data de nascimento (2)
                <input
                  type="text"
                  inputMode="numeric"
                  name="partner_birth_date"
                  placeholder="DD/MM/AAAA"
                  pattern="\d{2}/\d{2}/\d{4}"
                  defaultValue={formatBirthDateForInput(profile?.partner_birth_date)}
                  className="rounded border px-3 py-2"
                />
              </label>

              <label className="flex flex-col gap-1">
                Sexo (2)
                <select
                  name="partner_gender"
                  defaultValue={profile?.partner_gender ?? ""}
                  className="rounded border px-3 py-2"
                >
                  <option value="">Selecione</option>
                  {GENDER_OPTIONS.map((g) => (
                    <option key={g} value={g}>
                      {GENDER_LABELS[g]}
                    </option>
                  ))}
                </select>
              </label>

              <label className="flex flex-col gap-1">
                Orientação sexual (2)
                <select
                  name="partner_sexual_orientation"
                  defaultValue={profile?.partner_sexual_orientation ?? ""}
                  className="rounded border px-3 py-2"
                >
                  <option value="">Selecione</option>
                  {ORIENTATION_OPTIONS.map((o) => (
                    <option key={o} value={o}>
                      {ORIENTATION_LABELS[o]}
                    </option>
                  ))}
                </select>
              </label>
            </>
          )}

          <fieldset>
            <legend>O que busca</legend>
            <div className="mt-1 flex gap-4">
              {LOOKING_FOR_OPTIONS.map((option) => (
                <label key={option} className="flex items-center gap-1">
                  <input
                    type="checkbox"
                    name="looking_for"
                    value={option}
                    defaultChecked={profile?.looking_for?.includes(option) ?? false}
                  />
                  {LOOKING_FOR_LABELS[option]}
                </label>
              ))}
            </div>
          </fieldset>

          <button type="submit" className="self-start rounded border px-3 py-1.5">
            Salvar
          </button>
        </form>
      </section>

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
        <p className="rounded border border-amber-300 bg-amber-50 p-3 text-xs text-amber-800">
          Sua verificação só é aprovada com no mínimo 6 fotos no álbum
          (rosto + corpo somados).
          {profile?.profile_type === "casal" &&
            " Perfil casal também precisa de pelo menos uma foto de corpo inteiro de cada um dos dois — perfil com foto de só uma pessoa não é aceito."}
        </p>
        <h2 className="mt-4 text-lg font-medium">Fotos — Rosto</h2>
        <p className="text-sm text-neutral-500">
          Só fica visível para quem você aprovar um pedido de acesso.
        </p>
        <div className="mt-3">
          <PhotoGallery
            photos={rostoPhotos}
            commentsByPhoto={commentsByPhoto}
            likesByPhoto={likesByPhoto}
            currentUserId={user.id}
            photoOwnerId={user.id}
            revalidatePath="/perfil"
            deletePhotoAction={deletePhoto}
          />
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
        <div className="mt-3">
          <PhotoGallery
            photos={corpoPhotos}
            commentsByPhoto={commentsByPhoto}
            likesByPhoto={likesByPhoto}
            currentUserId={user.id}
            photoOwnerId={user.id}
            revalidatePath="/perfil"
            deletePhotoAction={deletePhoto}
          />
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
