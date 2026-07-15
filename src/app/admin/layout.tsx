import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/lib/auth-actions";
import { PinLockGate } from "@/components/PinLockGate";
import { PrimaryNav } from "@/components/PrimaryNav";
import { CalendarIcon, FlagIcon, ShieldCheckIcon, UsersIcon } from "@/components/icons";

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

  const [{ count: pendingReports }, { count: pendingVerifications }] = await Promise.all([
    supabase.from("user_reports").select("id", { count: "exact", head: true }).eq("status", "pending"),
    supabase
      .from("users")
      .select("id", { count: "exact", head: true })
      .eq("membership_status", "provisional"),
  ]);

  const primaryItems = [
    { href: "/admin/eventos", label: "Eventos", icon: <CalendarIcon /> },
    {
      href: "/admin/verificacoes",
      label: "Verificações",
      icon: <ShieldCheckIcon />,
      badge: pendingVerifications ?? 0,
    },
    { href: "/admin/usuarios", label: "Usuários", icon: <UsersIcon /> },
    {
      href: "/admin/denuncias",
      label: "Denúncias",
      icon: <FlagIcon />,
      badge: pendingReports ?? 0,
    },
  ];

  return (
    <PinLockGate>
      <header className="border-b border-line bg-surface">
        <div className="mx-auto flex max-w-3xl flex-col items-center gap-2 px-3 py-3">
          <span className="font-display text-lg text-accent">Lumeo</span>
          <PrimaryNav items={primaryItems} />
        </div>
      </header>

      <div className="pb-24">{children}</div>

      <footer className="fixed inset-x-0 bottom-0 z-40 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 border-t border-line bg-surface px-3 pb-[max(1rem,env(safe-area-inset-bottom))] pt-2 text-xs">
        <Link href="/inicio" className="text-foreground no-underline hover:text-accent">
          Início
        </Link>
        <Link href="/admin/planos" className="text-foreground no-underline hover:text-accent">
          Planos
        </Link>
        <form action={signOut}>
          <button type="submit" className="text-foreground no-underline hover:text-accent">
            Sair
          </button>
        </form>
      </footer>
    </PinLockGate>
  );
}
