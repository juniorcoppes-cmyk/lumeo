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

  const { count: unreadNotifications } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .is("read_at", null);

  return (
    <PinLockGate>
      <header className="flex justify-center border-b border-line bg-surface py-3">
        <span className="font-display text-lg text-accent">Lumeo</span>
      </header>
      <nav className="flex flex-wrap items-center gap-2 px-3 py-3 text-sm sm:px-6">
        <Link href="/inicio" className="rounded-full px-3 py-1.5 font-medium no-underline hover:bg-accent-soft">
          Início
        </Link>
        <Link href="/eventos" className="rounded-full px-3 py-1.5 font-medium no-underline hover:bg-accent-soft">
          Eventos
        </Link>
        <Link href="/comunidade" className="rounded-full px-3 py-1.5 font-medium no-underline hover:bg-accent-soft">
          Comunidade
        </Link>
        <Link href="/chat" className="rounded-full px-3 py-1.5 font-medium no-underline hover:bg-accent-soft">
          Chat
        </Link>
        <Link href="/notificacoes" className="rounded-full px-3 py-1.5 font-medium no-underline hover:bg-accent-soft">
          Notificações
          {!!unreadNotifications && (
            <span className="ml-1 rounded-full bg-accent px-1.5 py-0.5 text-xs font-normal text-on-accent">
              {unreadNotifications}
            </span>
          )}
        </Link>
        <Link href="/perfil" className="rounded-full px-3 py-1.5 font-medium no-underline hover:bg-accent-soft">
          Perfil
        </Link>
        <Link href="/assinatura" className="rounded-full px-3 py-1.5 font-medium no-underline hover:bg-accent-soft">
          Assinatura
        </Link>
        <Link href="/regras" className="rounded-full px-3 py-1.5 font-medium no-underline hover:bg-accent-soft">
          Regras
        </Link>
        {profile?.is_admin && (
          <Link href="/admin/eventos" className="rounded-full px-3 py-1.5 font-medium no-underline hover:bg-accent-soft">
            Admin
          </Link>
        )}
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
