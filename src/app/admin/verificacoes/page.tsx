import { createClient } from "@/lib/supabase/server";
import { approveVerification, rejectVerification } from "./actions";

const MIN_TOTAL_PHOTOS = 6;
const MIN_CORPO_PHOTOS_CASAL = 2;

export default async function AdminVerificacoesPage() {
  const supabase = await createClient();

  const { data: verifications } = await supabase
    .from("verifications")
    .select("id, user_id, document_url, video_url, created_at, users(name, email, profile_type)")
    .eq("status", "pending")
    .order("created_at", { ascending: true });

  const withDetails = await Promise.all(
    (verifications ?? []).map(async (v) => {
      const [{ data: doc }, { data: video }, { data: photos }] = await Promise.all([
        supabase.storage.from("verifications").createSignedUrl(v.document_url, 300),
        supabase.storage.from("verifications").createSignedUrl(v.video_url, 300),
        supabase.from("profile_photos").select("category").eq("user_id", v.user_id),
      ]);
      const totalPhotos = photos?.length ?? 0;
      const corpoPhotos = photos?.filter((p) => p.category === "corpo").length ?? 0;
      return { ...v, documentUrl: doc?.signedUrl, videoUrl: video?.signedUrl, totalPhotos, corpoPhotos };
    }),
  );

  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="text-2xl">Verificações</h1>
      <p className="mt-2 text-muted">
        Fila de aprovação de documento e vídeo dos usuários. Mínimo pra
        aprovar: 6 fotos no álbum no total; perfil casal precisa de pelo
        menos 2 fotos de corpo inteiro — confirme visualmente que são as
        duas pessoas do casal, o sistema não consegue checar isso sozinho.
      </p>

      <ul className="mt-6 flex flex-col gap-6">
        {withDetails.map((v) => {
          const user = Array.isArray(v.users) ? v.users[0] : v.users;
          const isCasal = user?.profile_type === "casal";
          const meetsTotal = v.totalPhotos >= MIN_TOTAL_PHOTOS;
          const meetsCorpo = !isCasal || v.corpoPhotos >= MIN_CORPO_PHOTOS_CASAL;
          const meetsMinimum = meetsTotal && meetsCorpo;

          return (
            <li key={v.id} className="card">
              <p className="font-medium text-foreground">{user?.name}</p>
              <p className="text-sm text-muted">{user?.email}</p>
              <div className="mt-2 flex gap-4 text-sm">
                {v.documentUrl && (
                  <a href={v.documentUrl} target="_blank" rel="noreferrer">
                    Ver documento
                  </a>
                )}
                {v.videoUrl && (
                  <a href={v.videoUrl} target="_blank" rel="noreferrer">
                    Ver vídeo
                  </a>
                )}
              </div>

              <p className={`mt-2 text-sm ${meetsMinimum ? "text-muted" : "text-red-400"}`}>
                Álbum: {v.totalPhotos} foto(s) no total
                {isCasal && ` · ${v.corpoPhotos} de corpo inteiro`}
                {!meetsMinimum && (
                  <>
                    {" "}
                    — abaixo do mínimo ({MIN_TOTAL_PHOTOS} no total
                    {isCasal && `, ${MIN_CORPO_PHOTOS_CASAL} de corpo inteiro pro casal`})
                  </>
                )}
              </p>

              <div className="mt-4 flex flex-wrap items-center gap-2">
                <form action={approveVerification}>
                  <input type="hidden" name="verification_id" value={v.id} />
                  <button type="submit" className="btn-primary">
                    Aprovar
                  </button>
                </form>
                <form action={rejectVerification} className="flex items-center gap-2">
                  <input type="hidden" name="verification_id" value={v.id} />
                  <input
                    type="text"
                    name="rejection_reason"
                    placeholder="Motivo da reprovação"
                    required
                    className="input !py-1 text-sm"
                  />
                  <button type="submit" className="btn-secondary">
                    Reprovar
                  </button>
                </form>
              </div>
            </li>
          );
        })}
        {withDetails.length === 0 && (
          <p className="text-muted">Nenhuma verificação pendente.</p>
        )}
      </ul>
    </main>
  );
}
