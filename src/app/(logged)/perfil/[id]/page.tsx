import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ExperienceBadge } from "@/components/ExperienceBadge";
import { PhotoGallery } from "@/components/PhotoGallery";
import {
  CONNECTION_TYPE_LABELS,
  CONNECTION_TYPE_OPTIONS,
  GENDER_LABELS,
  LOOKING_FOR_LABELS,
  ORIENTATION_LABELS,
  RATING_TAG_LABELS,
  RATING_TAG_OPTIONS,
  calculateAge,
  type Gender,
  type LookingFor,
  type Orientation,
} from "@/lib/profile-options";
import {
  proposeConnection,
  reportUser,
  requestPhotoAccess,
  respondConnection,
  saveRating,
} from "./actions";

const REPORT_REASON_LABELS: Record<string, string> = {
  spam: "Spam",
  mensagem_ofensiva: "Mensagem ofensiva",
  conteudo_inadequado: "Conteúdo inadequado",
  assedio: "Assédio",
  perfil_falso: "Perfil falso",
  outro: "Outro",
};

export default async function OutroPerfilPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ reported?: string }>;
}) {
  const { id } = await params;
  const { reported } = await searchParams;
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
    .select("verification_badge_id, is_admin, is_support_channel")
    .eq("id", user.id)
    .single();

  const viewerCanBrowse =
    !!viewerProfile?.verification_badge_id ||
    !!viewerProfile?.is_admin ||
    !!viewerProfile?.is_support_channel;

  if (!viewerCanBrowse) {
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

  const avatarUrl = target.avatar_path
    ? (
        await supabase.storage
          .from("profile-photos")
          .createSignedUrl(target.avatar_path, 300)
      ).data?.signedUrl
    : undefined;

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

  const { data: connection } = await supabase
    .from("user_connections")
    .select("id, requester_id, target_id, connection_type, status")
    .or(`and(requester_id.eq.${user.id},target_id.eq.${id}),and(requester_id.eq.${id},target_id.eq.${user.id})`)
    .maybeSingle();

  const isConnectionApproved = connection?.status === "approved";
  const targetRoles: { role: "self" | "man" | "woman"; label: string }[] =
    target.profile_type === "casal"
      ? [
          { role: "man", label: "Homem do casal" },
          { role: "woman", label: "Mulher do casal" },
        ]
      : [{ role: "self", label: "Avaliação" }];

  const ratingsData = isConnectionApproved
    ? await Promise.all(
        targetRoles.map(async ({ role }) => {
          const [{ data: counts }, { data: ownRating }] = await Promise.all([
            supabase.rpc("get_profile_rating_counts", {
              p_user_id: id,
              p_target_role: role,
            }),
            supabase
              .from("profile_ratings")
              .select("tags")
              .eq("rater_id", user.id)
              .eq("target_id", id)
              .eq("target_role", role)
              .maybeSingle(),
          ]);
          return { role, counts: counts ?? [], ownTags: ownRating?.tags ?? [] };
        }),
      )
    : [];

  const allPhotoIds = [...corpoWithUrls, ...rostoWithUrls].map((p) => p.id);
  const { data: comments } = allPhotoIds.length
    ? await supabase
        .from("photo_comments")
        .select("id, photo_id, author_id, content, created_at, users!author_id(name)")
        .in("photo_id", allPhotoIds)
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

  const [{ data: likeCounts }, { data: myLikes }] = allPhotoIds.length
    ? await Promise.all([
        supabase.rpc("get_photo_like_counts", { p_photo_ids: allPhotoIds }),
        supabase.from("photo_likes").select("photo_id").eq("user_id", user.id).in("photo_id", allPhotoIds),
      ])
    : [{ data: [] }, { data: [] }];

  const myLikedPhotoIds = new Set((myLikes ?? []).map((l) => l.photo_id));
  const likesByPhoto: Record<string, { count: number; likedByMe: boolean }> = {};
  for (const photoId of allPhotoIds) {
    likesByPhoto[photoId] = {
      count: Number(
        likeCounts?.find((l: { photo_id: string }) => l.photo_id === photoId)?.like_count ?? 0,
      ),
      likedByMe: myLikedPhotoIds.has(photoId),
    };
  }

  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <div className="flex items-center gap-4">
        {avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={avatarUrl}
            alt=""
            className="h-16 w-16 rounded-full object-cover"
          />
        ) : (
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-neutral-100 text-xs text-neutral-500">
            Sem foto
          </div>
        )}
        <h1 className="text-2xl font-semibold">{target.name}</h1>
      </div>
      <div className="mt-2 flex items-center gap-2 text-sm text-neutral-600">
        <span>{target.profile_type}</span>
        <ExperienceBadge level={target.experience_level} />
      </div>

      {target.bio && <p className="mt-3 text-sm text-neutral-700">{target.bio}</p>}

      <dl className="mt-4 flex flex-col gap-1 text-sm text-neutral-600">
        {target.profile_type === "casal" ? (
          <>
            <div>
              <dt className="inline text-neutral-500">Pessoa 1 — </dt>
              <dd className="inline">
                {calculateAge(target.birth_date) !== null && `${calculateAge(target.birth_date)} anos`}
                {target.gender && ` · ${GENDER_LABELS[target.gender as Gender]}`}
                {target.sexual_orientation &&
                  ` · ${ORIENTATION_LABELS[target.sexual_orientation as Orientation]}`}
              </dd>
            </div>
            <div>
              <dt className="inline text-neutral-500">Pessoa 2 — </dt>
              <dd className="inline">
                {calculateAge(target.partner_birth_date) !== null &&
                  `${calculateAge(target.partner_birth_date)} anos`}
                {target.partner_gender && ` · ${GENDER_LABELS[target.partner_gender as Gender]}`}
                {target.partner_sexual_orientation &&
                  ` · ${ORIENTATION_LABELS[target.partner_sexual_orientation as Orientation]}`}
              </dd>
            </div>
          </>
        ) : (
          <div>
            {calculateAge(target.birth_date) !== null && `${calculateAge(target.birth_date)} anos`}
            {target.gender && ` · ${GENDER_LABELS[target.gender as Gender]}`}
            {target.sexual_orientation &&
              ` · ${ORIENTATION_LABELS[target.sexual_orientation as Orientation]}`}
          </div>
        )}
        {target.looking_for && target.looking_for.length > 0 && (
          <div>
            Busca:{" "}
            {(target.looking_for as LookingFor[])
              .map((option) => LOOKING_FOR_LABELS[option])
              .join(", ")}
          </div>
        )}
      </dl>

      <section className="mt-8 border-t pt-6">
        <h2 className="text-lg font-medium">Conexão</h2>
        {!connection && (
          <form action={proposeConnection} className="mt-2 flex items-center gap-2 text-sm">
            <input type="hidden" name="target_id" value={id} />
            <select name="connection_type" required className="rounded border px-2 py-1">
              {CONNECTION_TYPE_OPTIONS.map((type) => (
                <option key={type} value={type}>
                  {CONNECTION_TYPE_LABELS[type]}
                </option>
              ))}
            </select>
            <button type="submit" className="rounded border px-3 py-1">
              Propor conexão
            </button>
          </form>
        )}
        {connection?.status === "pending" && connection.requester_id === user.id && (
          <p className="mt-2 text-sm text-neutral-600">
            Proposta de {CONNECTION_TYPE_LABELS[connection.connection_type as keyof typeof CONNECTION_TYPE_LABELS]} enviada — aguardando confirmação.
          </p>
        )}
        {connection?.status === "pending" && connection.requester_id !== user.id && (
          <div className="mt-2 flex items-center gap-2 text-sm">
            <span>
              {target.name} propôs:{" "}
              {CONNECTION_TYPE_LABELS[connection.connection_type as keyof typeof CONNECTION_TYPE_LABELS]}
            </span>
            <form action={respondConnection}>
              <input type="hidden" name="connection_id" value={connection.id} />
              <input type="hidden" name="other_user_id" value={id} />
              <input type="hidden" name="decision" value="approved" />
              <button type="submit" className="rounded border px-2 py-1">
                Aceitar
              </button>
            </form>
            <form action={respondConnection}>
              <input type="hidden" name="connection_id" value={connection.id} />
              <input type="hidden" name="other_user_id" value={id} />
              <input type="hidden" name="decision" value="denied" />
              <button type="submit" className="rounded border px-2 py-1">
                Recusar
              </button>
            </form>
          </div>
        )}
        {isConnectionApproved && (
          <p className="mt-2 text-sm text-neutral-600">
            Vocês são{" "}
            {CONNECTION_TYPE_LABELS[connection!.connection_type as keyof typeof CONNECTION_TYPE_LABELS]}.
          </p>
        )}
        {connection?.status === "denied" && (
          <p className="mt-2 text-sm text-red-600">Proposta de conexão negada.</p>
        )}
      </section>

      {isConnectionApproved && (
        <section className="mt-8 border-t pt-6">
          <h2 className="text-lg font-medium">Avaliação</h2>
          {ratingsData.map(({ role, counts, ownTags }) => (
            <div key={role} className="mt-3">
              {target.profile_type === "casal" && (
                <p className="text-sm font-medium">
                  {targetRoles.find((r) => r.role === role)?.label}
                </p>
              )}
              <p className="mt-1 text-xs text-neutral-500">
                {counts
                  .map(
                    (c: { tag: string; tag_count: number }) =>
                      `${RATING_TAG_LABELS[c.tag as keyof typeof RATING_TAG_LABELS]}: ${c.tag_count}`,
                  )
                  .join(" · ")}
              </p>
              <form action={saveRating} className="mt-2 flex flex-wrap items-center gap-3 text-sm">
                <input type="hidden" name="target_id" value={id} />
                <input type="hidden" name="target_role" value={role} />
                {RATING_TAG_OPTIONS.map((tag) => (
                  <label key={tag} className="flex items-center gap-1">
                    <input
                      type="checkbox"
                      name="tags"
                      value={tag}
                      defaultChecked={ownTags.includes(tag)}
                    />
                    {RATING_TAG_LABELS[tag]}
                  </label>
                ))}
                <button type="submit" className="rounded border px-3 py-1">
                  Salvar avaliação
                </button>
              </form>
            </div>
          ))}
        </section>
      )}

      <section className="mt-8">
        <h2 className="text-lg font-medium">Fotos — Corpo</h2>
        <div className="mt-3">
          <PhotoGallery
            photos={corpoWithUrls}
            commentsByPhoto={commentsByPhoto}
            likesByPhoto={likesByPhoto}
            currentUserId={user.id}
            photoOwnerId={id}
            revalidatePath={`/perfil/${id}`}
          />
          {corpoWithUrls.length === 0 && (
            <p className="text-sm text-neutral-500">Nenhuma foto ainda.</p>
          )}
        </div>
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-medium">Fotos — Rosto</h2>

        {accessRequest?.status === "approved" ? (
          <div className="mt-3">
            <PhotoGallery
              photos={rostoWithUrls}
              commentsByPhoto={commentsByPhoto}
              likesByPhoto={likesByPhoto}
              currentUserId={user.id}
              photoOwnerId={id}
              revalidatePath={`/perfil/${id}`}
            />
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

      <section className="mt-10 border-t pt-6">
        <details>
          <summary className="cursor-pointer text-sm text-red-600 underline">
            Denunciar este perfil
          </summary>
          {reported ? (
            <p className="mt-3 text-sm text-neutral-600">
              Denúncia enviada — nossa equipe vai avaliar.
            </p>
          ) : (
            <form action={reportUser} className="mt-3 flex flex-col gap-2 text-sm">
              <input type="hidden" name="reported_id" value={id} />
              <select name="reason" required className="rounded border px-2 py-1.5">
                {Object.entries(REPORT_REASON_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
              <textarea
                name="description"
                placeholder="Detalhes (opcional)"
                rows={3}
                className="rounded border px-2 py-1.5"
              />
              <button
                type="submit"
                className="self-start rounded border border-red-600 px-3 py-1.5 text-red-600"
              >
                Enviar denúncia
              </button>
            </form>
          )}
        </details>
      </section>
    </main>
  );
}
