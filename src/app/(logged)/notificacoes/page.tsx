import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getUser } from "@/lib/supabase/get-user";

export default async function NotificacoesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await getUser();
  if (!user) redirect("/login");

  const { data: notifications } = await supabase
    .from("notifications")
    .select("id, type, content, related_user_id, read_at, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  // Mesmo padrão de /chat/[id]: marca como lida ao abrir a página, direto
  // no carregamento (não precisa de botão separado).
  await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("user_id", user.id)
    .is("read_at", null);

  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <h1 className="text-2xl">Notificações</h1>

      <ul className="mt-6 flex flex-col gap-2">
        {notifications?.map((n) => (
          <li
            key={n.id}
            className={`card text-sm ${!n.read_at ? "font-bold" : ""}`}
          >
            {n.related_user_id ? (
              <Link href={`/perfil/${n.related_user_id}`}>
                {n.content}
              </Link>
            ) : (
              <span>{n.content}</span>
            )}
            <span className="ml-2 text-xs font-normal text-muted">
              {new Date(n.created_at).toLocaleString("pt-BR")}
            </span>
          </li>
        ))}
        {notifications?.length === 0 && (
          <p className="text-muted">Nenhuma notificação ainda.</p>
        )}
      </ul>
    </main>
  );
}
