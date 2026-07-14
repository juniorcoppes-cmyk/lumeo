import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { markReportReviewed } from "./actions";

const REASON_LABELS: Record<string, string> = {
  spam: "Spam",
  mensagem_ofensiva: "Mensagem ofensiva",
  conteudo_inadequado: "Conteúdo inadequado",
  assedio: "Assédio",
  perfil_falso: "Perfil falso",
  outro: "Outro",
};

export default async function AdminDenunciasPage() {
  const supabase = await createClient();

  const { data: reports } = await supabase
    .from("user_reports")
    .select(
      "id, reason, description, status, admin_notes, created_at, reporter_id, reported_id, reporter:users!reporter_id(name), reported:users!reported_id(name)",
    )
    .order("status", { ascending: true })
    .order("created_at", { ascending: false });

  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="text-2xl font-semibold">Denúncias (admin)</h1>

      <ul className="mt-6 flex flex-col gap-4">
        {reports?.map((r) => {
          const reporter = Array.isArray(r.reporter) ? r.reporter[0] : r.reporter;
          const reported = Array.isArray(r.reported) ? r.reported[0] : r.reported;
          return (
            <li
              key={r.id}
              className={`rounded-lg border p-4 text-sm ${
                r.status === "pending" ? "border-amber-400" : "border-neutral-200"
              }`}
            >
              <p>
                <Link href={`/perfil/${r.reporter_id}`} className="underline">
                  {reporter?.name}
                </Link>{" "}
                denunciou{" "}
                <Link href={`/perfil/${r.reported_id}`} className="underline">
                  {reported?.name}
                </Link>{" "}
                · <strong>{REASON_LABELS[r.reason] ?? r.reason}</strong> ·{" "}
                {new Date(r.created_at).toLocaleString("pt-BR")}
              </p>
              {r.description && <p className="mt-1 text-neutral-600">{r.description}</p>}

              {r.status === "reviewed" ? (
                <p className="mt-2 text-xs text-neutral-500">
                  Revisada{r.admin_notes ? ` — ${r.admin_notes}` : ""}
                </p>
              ) : (
                <form action={markReportReviewed} className="mt-2 flex items-center gap-2">
                  <input type="hidden" name="report_id" value={r.id} />
                  <input
                    type="text"
                    name="admin_notes"
                    placeholder="Nota (opcional)"
                    className="rounded border px-2 py-1 text-sm"
                  />
                  <button type="submit" className="rounded border px-2 py-1 text-sm">
                    Marcar como revisada
                  </button>
                </form>
              )}
            </li>
          );
        })}
        {reports?.length === 0 && <p className="text-neutral-600">Nenhuma denúncia ainda.</p>}
      </ul>
    </main>
  );
}
