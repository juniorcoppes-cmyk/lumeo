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

  const { data: profile } = await supabase
    .from("users")
    .select("is_admin, verification_badge_id, pending_invite_code")
    .eq("id", user.id)
    .single();

  // Convite pendente de antes da verificação: assim que aprovado, a
  // primeira página logada que a pessoa abrir (login normal, sem precisar
  // do link original de novo) já leva direto pro evento indicado.
  if (profile?.pending_invite_code && profile.verification_badge_id) {
    const code = profile.pending_invite_code;
    await supabase.from("users").update({ pending_invite_code: null }).eq("id", user.id);
    redirect(`/convite/${code}`);
  }

  return (
    <PinLockGate>
      <header className="flex justify-center border-b py-3">
        <span className="text-lg font-semibold tracking-tight">Lumeo</span>
      </header>
      <nav className="flex flex-wrap items-center gap-x-4 gap-y-2 px-3 py-3 text-sm sm:px-6">
        <Link href="/inicio" className="font-medium underline">
          Início
        </Link>
        <Link href="/eventos" className="font-medium underline">
          Eventos
        </Link>
        <Link href="/comunidade" className="font-medium underline">
          Comunidade
        </Link>
        <Link href="/chat" className="font-medium underline">
          Chat
        </Link>
        <Link href="/perfil" className="font-medium underline">
          Perfil
        </Link>
        <Link href="/assinatura" className="font-medium underline">
          Assinatura
        </Link>
        {profile?.is_admin && (
          <Link href="/admin/eventos" className="font-medium underline">
            Admin
          </Link>
        )}
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
