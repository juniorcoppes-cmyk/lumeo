import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getUser } from "@/lib/supabase/get-user";
import { signOut } from "@/lib/auth-actions";
import { PinLockGate } from "@/components/PinLockGate";
import { PrimaryNav } from "@/components/PrimaryNav";
import { CalendarIcon, HomeIcon, MessageIcon, UserIcon, UsersIcon } from "@/components/icons";

export default async function LoggedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await getUser();

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

  const primaryItems = [
    { href: "/inicio", label: "Início", icon: <HomeIcon /> },
    { href: "/eventos", label: "Eventos", icon: <CalendarIcon /> },
    { href: "/comunidade", label: "Comunidade", icon: <UsersIcon /> },
    { href: "/chat", label: "Chat", icon: <MessageIcon /> },
    { href: "/perfil", label: "Perfil", icon: <UserIcon /> },
  ];

  return (
    <PinLockGate>
      <header className="border-b border-line bg-surface">
        <div className="mx-auto flex max-w-3xl flex-col items-center gap-2 px-3 py-3">
          <span className="font-display text-lg text-accent">Lumeo</span>
          <PrimaryNav items={primaryItems} />
        </div>
      </header>

      <div className="pb-16">{children}</div>

      <footer className="fixed inset-x-0 bottom-0 z-40 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 border-t border-line bg-surface px-3 py-2 text-xs">
        <Link href="/notificacoes" className="text-foreground no-underline hover:text-accent">
          Notificações
          {!!unreadNotifications && (
            <span className="ml-1 rounded-full bg-accent px-1.5 py-0.5 text-[10px] font-semibold text-on-accent">
              {unreadNotifications}
            </span>
          )}
        </Link>
        <Link href="/assinatura" className="text-foreground no-underline hover:text-accent">
          Assinatura
        </Link>
        <Link href="/regras" className="text-foreground no-underline hover:text-accent">
          Regras
        </Link>
        {profile?.is_admin && (
          <Link href="/admin/eventos" className="text-foreground no-underline hover:text-accent">
            Admin
          </Link>
        )}
        <form action={signOut}>
          <button type="submit" className="text-foreground no-underline hover:text-accent">
            Sair
          </button>
        </form>
      </footer>
    </PinLockGate>
  );
}
