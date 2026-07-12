import { createClient } from "@/lib/supabase/server";
import { approveVerification, rejectVerification } from "./actions";

export default async function AdminVerificacoesPage() {
  const supabase = await createClient();

  const { data: verifications } = await supabase
    .from("verifications")
    .select("id, document_url, video_url, created_at, users(name, email)")
    .eq("status", "pending")
    .order("created_at", { ascending: true });

  const withSignedUrls = await Promise.all(
    (verifications ?? []).map(async (v) => {
      const [{ data: doc }, { data: video }] = await Promise.all([
        supabase.storage.from("verifications").createSignedUrl(v.document_url, 300),
        supabase.storage.from("verifications").createSignedUrl(v.video_url, 300),
      ]);
      return { ...v, documentUrl: doc?.signedUrl, videoUrl: video?.signedUrl };
    }),
  );

  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="text-2xl font-semibold">Verificações</h1>
      <p className="mt-2 text-neutral-600">
        Fila de aprovação de documento e vídeo dos usuários.
      </p>

      <ul className="mt-6 flex flex-col gap-6">
        {withSignedUrls.map((v) => {
          const user = Array.isArray(v.users) ? v.users[0] : v.users;
          return (
            <li key={v.id} className="rounded-lg border p-4">
              <p className="font-medium">{user?.name}</p>
              <p className="text-sm text-neutral-600">{user?.email}</p>
              <div className="mt-2 flex gap-4 text-sm">
                {v.documentUrl && (
                  <a href={v.documentUrl} target="_blank" rel="noreferrer" className="underline">
                    Ver documento
                  </a>
                )}
                {v.videoUrl && (
                  <a href={v.videoUrl} target="_blank" rel="noreferrer" className="underline">
                    Ver vídeo
                  </a>
                )}
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-2">
                <form action={approveVerification}>
                  <input type="hidden" name="verification_id" value={v.id} />
                  <button type="submit" className="rounded bg-black px-3 py-1.5 text-sm text-white">
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
                    className="rounded border px-2 py-1 text-sm"
                  />
                  <button type="submit" className="rounded border px-3 py-1.5 text-sm">
                    Reprovar
                  </button>
                </form>
              </div>
            </li>
          );
        })}
        {withSignedUrls.length === 0 && (
          <p className="text-neutral-600">Nenhuma verificação pendente.</p>
        )}
      </ul>
    </main>
  );
}
