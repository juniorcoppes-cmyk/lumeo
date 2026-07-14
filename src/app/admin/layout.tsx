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

  return (
    <PinLockGate>
      <nav className="flex flex-wrap items-center gap-x-4 gap-y-2 px-3 py-2 text-sm sm:px-6">
        <Link href="/inicio" className="font-medium underline">
          Início
        </Link>
        <Link href="/admin/eventos" className="font-medium underline">
          Eventos
        </Link>
        <Link href="/admin/verificacoes" className="font-medium underline">
          Verificações
        </Link>
        <Link href="/admin/usuarios" className="font-medium underline">
          Usuários
        </Link>
        <form action={signOut} className="ml-auto">
          <button type="submit" className="text-neutral-500 underline">
            Sair
          </button>
        </form>
      </nav>
      {children}
    </PinLockGate>
  );
}
