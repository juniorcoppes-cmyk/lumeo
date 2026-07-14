import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/lib/auth-actions";
import { PinLockGate } from "@/components/PinLockGate";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("users")
    .select("is_admin")
    .eq("id", user.id)
    .single();

  if (!profile?.is_admin) redirect("/inicio");

  const { count: pendingReports } = await supabase
    .from("user_reports")
    .select("id", { count: "exact", head: true })
    .eq("status", "pending");

  return (
    <PinLockGate>
      <header className="flex justify-center border-b border-line bg-surface py-3">
        <span className="font-display text-lg text-accent">Lumeo</span>
      </header>
      <nav className="flex flex-wrap items-center gap-2 px-3 py-3 text-sm sm:px-6">
        <Link href="/inicio" className="rounded-full px-3 py-1.5 font-medium no-underline hover:bg-accent-soft">
          Início
        </Link>
        <Link href="/admin/eventos" className="rounded-full px-3 py-1.5 font-medium no-underline hover:bg-accent-soft">
          Eventos
        </Link>
        <Link href="/admin/verificacoes" className="rounded-full px-3 py-1.5 font-medium no-underline hover:bg-accent-soft">
          Verificações
        </Link>
        <Link href="/admin/usuarios" className="rounded-full px-3 py-1.5 font-medium no-underline hover:bg-accent-soft">
          Usuários
        </Link>
        <Link href="/admin/planos" className="rounded-full px-3 py-1.5 font-medium no-underline hover:bg-accent-soft">
          Planos
        </Link>
        <Link href="/admin/denuncias" className="rounded-full px-3 py-1.5 font-medium no-underline hover:bg-accent-soft">
          Denúncias
          {!!pendingReports && (
            <span className="ml-1 rounded-full bg-accent px-1.5 py-0.5 text-xs font-normal text-on-accent">
              {pendingReports}
            </span>
          )}
        </Link>
        <form action={signOut} className="ml-auto">
          <button type="submit" className="rounded-full px-3 py-1.5 text-muted no-underline">
            Sair
          </button>
        </form>
      </nav>
      {children}
    </PinLockGate>
  );
}
