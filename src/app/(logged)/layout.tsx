import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/lib/auth-actions";
import { PinLockGate } from "@/components/PinLockGate";

export default async function LoggedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  return (
    <PinLockGate>
      <nav className="flex items-center justify-between gap-2 px-3 py-2 text-sm sm:px-6">
        <div className="flex gap-4 overflow-x-auto whitespace-nowrap font-medium">
          <Link href="/inicio" className="underline">
            Início
          </Link>
          <Link href="/eventos" className="underline">
            Eventos
          </Link>
          <Link href="/comunidade" className="underline">
            Comunidade
          </Link>
          <Link href="/chat" className="underline">
            Chat
          </Link>
          <Link href="/perfil" className="underline">
            Perfil
          </Link>
          <Link href="/assinatura" className="underline">
            Assinatura
          </Link>
        </div>
        <form action={signOut} className="shrink-0">
          <button type="submit" className="text-neutral-500 underline">
            Sair
          </button>
        </form>
      </nav>
      {children}
    </PinLockGate>
  );
}
