import { createClient } from "@/lib/supabase/server";
import { PhotoGallery } from "@/components/PhotoGallery";
import { formatarDataHora } from "@/lib/datas";
import { finalizeMembership } from "./actions";

const MIN_TOTAL_PHOTOS = 6;
const MIN_CORPO_PHOTOS_CASAL = 2;
const REVIEW_WINDOW_HOURS = 48;

export default async function AdminVerificacoesPage() {
  const supabase = await createClient();

  const { data: pending } = await supabase
    .from("users")
    .select("id, name, email, profile_type, bio, sponsor_responded_at, users:referred_by(name)")
    .eq("membership_status", "provisional")
    .order("sponsor_responded_at", { ascending: true });

  const withDetails = await Promise.all(
    (pending ?? []).map(async (p) => {
      const { data: photos } = await supabase
        .from("profile_photos")
        .select("id, category, storage_path")
        .eq("user_id", p.id)
        .order("position", { ascending: true });

      const photosWithUrls = await Promise.all(
        (photos ?? []).map(async (photo) => {
          const { data } = await supabase.storage
            .from("profile-photos")
            .createSignedUrl(photo.storage_path, 300);
          return { ...photo, url: data?.signedUrl };
        }),
      );

      const totalPhotos = photosWithUrls.length;
      const corpoPhotos = photosWithUrls.filter((ph) => ph.category === "corpo").length;
      const deadline = p.sponsor_responded_at
        ? new Date(new Date(p.sponsor_responded_at).getTime() + REVIEW_WINDOW_HOURS * 60 * 60 * 1000)
        : null;

      return { ...p, photosWithUrls, totalPhotos, corpoPhotos, deadline };
    }),
  );

  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="text-2xl">Verificações</h1>
      <p className="mt-2 text-muted">
        Perfis com apadrinhamento aceito, já com acesso liberado, esperando a
        confirmação definitiva em até {REVIEW_WINDOW_HOURS}h. Mínimo pra
        confirmar: {MIN_TOTAL_PHOTOS} fotos no álbum no total; perfil casal
        precisa de pelo menos {MIN_CORPO_PHOTOS_CASAL} fotos de corpo inteiro
        — confirme visualmente que são as duas pessoas do casal, o sistema
        não consegue checar isso sozinho.
      </p>

      <ul className="mt-6 flex flex-col gap-6">
        {withDetails.map((p) => {
          const isCasal = p.profile_type === "casal";
          const meetsTotal = p.totalPhotos >= MIN_TOTAL_PHOTOS;
          const meetsCorpo = !isCasal || p.corpoPhotos >= MIN_CORPO_PHOTOS_CASAL;
          const meetsMinimum = meetsTotal && meetsCorpo;
          const sponsor = Array.isArray(p.users) ? p.users[0] : p.users;
          const overdue = p.deadline ? p.deadline.getTime() < Date.now() : false;

          return (
            <li key={p.id} className="card">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-medium text-foreground">{p.name}</p>
                  <p className="text-sm text-muted">{p.email}</p>
                  <p className="text-sm text-muted">Padrinho: {sponsor?.name ?? "—"}</p>
                </div>
                {p.deadline && (
                  <span className={`tag ${overdue ? "!bg-red-900/40 !text-red-300" : ""}`}>
                    {overdue ? "Prazo vencido" : "Prazo"}: {formatarDataHora(p.deadline)}
                  </span>
                )}
              </div>

              {p.bio && <p className="mt-2 text-sm text-foreground/90">{p.bio}</p>}

              <p className={`mt-2 text-sm ${meetsMinimum ? "text-muted" : "text-red-400"}`}>
                Álbum: {p.totalPhotos} foto(s) no total
                {isCasal && ` · ${p.corpoPhotos} de corpo inteiro`}
                {!meetsMinimum && (
                  <>
                    {" "}
                    — abaixo do mínimo ({MIN_TOTAL_PHOTOS} no total
                    {isCasal && `, ${MIN_CORPO_PHOTOS_CASAL} de corpo inteiro pro casal`})
                  </>
                )}
              </p>

              <div className="mt-3">
                <PhotoGallery
                  photos={p.photosWithUrls}
                  commentsByPhoto={{}}
                  likesByPhoto={{}}
                  currentUserId={p.id}
                  photoOwnerId={p.id}
                  revalidatePath="/admin/verificacoes"
                />
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-2">
                <form action={finalizeMembership}>
                  <input type="hidden" name="user_id" value={p.id} />
                  <input type="hidden" name="decision" value="approve" />
                  <button type="submit" className="btn-primary">
                    Confirmar associação
                  </button>
                </form>
                <form action={finalizeMembership}>
                  <input type="hidden" name="user_id" value={p.id} />
                  <input type="hidden" name="decision" value="reject" />
                  <button type="submit" className="btn-secondary">
                    Reprovar (revoga acesso)
                  </button>
                </form>
              </div>
            </li>
          );
        })}
        {withDetails.length === 0 && (
          <p className="text-muted">Nenhum perfil esperando confirmação no momento.</p>
        )}
      </ul>
    </main>
  );
}
