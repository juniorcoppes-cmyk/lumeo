import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getUser } from "@/lib/supabase/get-user";
import { formatarDataHora } from "@/lib/datas";

type PresenceRow = {
  user_id: string;
  name: string;
  verification_badge_id: string | null;
  status: string;
  checked_in_at: string | null;
};

export default async function ListaDePresencaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await getUser();
  if (!user) redirect("/login");

  const [{ data: profile }, { data: event }] = await Promise.all([
    supabase.from("users").select("is_admin").eq("id", user.id).single(),
    supabase.from("events").select("title, event_date").eq("id", id).single(),
  ]);

  if (!profile?.is_admin) {
    return (
      <main className="mx-auto max-w-3xl px-6 py-16">
        <h1 className="text-2xl">Acesso restrito</h1>
        <p className="mt-4 text-sm text-muted">
          A lista de presença é só pra organização.{" "}
          <Link href={`/eventos/${id}`}>Voltar ao evento</Link>.
        </p>
      </main>
    );
  }

  const { data } = await supabase.rpc("event_presence_list", { p_event_id: id });
  const rows = (data ?? []) as PresenceRow[];
  const presentes = rows.filter((r) => r.checked_in_at).length;

  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <Link href={`/eventos/${id}`} className="text-sm text-muted no-underline hover:text-accent">
        ← {event?.title ?? "Evento"}
      </Link>
      <h1 className="mt-1 text-2xl">Lista de presença</h1>
      <p className="mt-1 text-sm text-muted">
        {presentes} de {rows.length} inscrito{rows.length === 1 ? "" : "s"} já fizeram check-in.
      </p>

      <ul className="mt-6 flex flex-col divide-y divide-line">
        {rows.map((r) => (
          <li key={r.user_id} className="flex items-center justify-between gap-3 py-3">
            <div className="flex flex-col">
              <Link
                href={`/perfil/${r.user_id}`}
                className="text-sm font-medium text-foreground no-underline hover:text-accent"
              >
                {r.name}
              </Link>
              {r.verification_badge_id && (
                <span className="text-xs text-muted">Selo {r.verification_badge_id}</span>
              )}
            </div>
            {r.checked_in_at ? (
              <span className="flex flex-col items-end text-xs text-green-400">
                <span className="font-medium">✓ Presente</span>
                <span className="text-muted">{formatarDataHora(r.checked_in_at)}</span>
              </span>
            ) : (
              <span className="text-xs text-muted">Não chegou</span>
            )}
          </li>
        ))}
        {rows.length === 0 && (
          <li className="py-3 text-sm text-muted">Ninguém inscrito ainda.</li>
        )}
      </ul>
    </main>
  );
}
