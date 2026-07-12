import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/lib/auth-actions";

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
    <>
      <nav className="flex items-center justify-between px-6 py-2 text-sm">
        <div className="flex gap-4 font-medium">
          <Link href="/inicio" className="underline">
            Início
          </Link>
          <Link href="/admin/eventos" className="underline">
            Eventos
          </Link>
          <Link href="/admin/verificacoes" className="underline">
            Verificações
          </Link>
          <Link href="/admin/usuarios" className="underline">
            Usuários
          </Link>
        </div>
        <form action={signOut}>
          <button type="submit" className="text-neutral-500 underline">
            Sair
          </button>
        </form>
      </nav>
      {children}
    </>
  );
}
