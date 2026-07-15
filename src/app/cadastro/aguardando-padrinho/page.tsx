import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getUser } from "@/lib/supabase/get-user";

export default async function AguardandoPadrinhoPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("users")
    .select("membership_status, referred_by, users:referred_by(name)")
    .eq("id", user.id)
    .single();

  if (!profile) redirect("/login");

  if (profile.membership_status === "provisional" || profile.membership_status === "member") {
    redirect("/inicio");
  }

  const sponsor = Array.isArray(profile.users) ? profile.users[0] : profile.users;

  return (
    <main className="mx-auto max-w-sm px-6 py-16">
      <h1 className="text-2xl">Cadastro em análise</h1>
      {profile.membership_status === "rejected_by_sponsor" ? (
        <p className="mt-4 text-sm text-red-400">
          {sponsor?.name ?? "Seu padrinho"} não aceitou apadrinhar seu perfil, então não foi
          possível liberar seu acesso. Fale com quem te convidou ou peça um novo link de convite
          a outra pessoa da comunidade.
        </p>
      ) : profile.membership_status === "rejected_by_admin" ? (
        <p className="mt-4 text-sm text-red-400">
          Seu perfil não foi confirmado pela administração. Entre em contato pelo suporte se
          quiser entender o motivo.
        </p>
      ) : (
        <p className="mt-2 text-sm text-muted">
          Seu cadastro foi enviado! Agora falta{" "}
          <strong className="text-foreground">{sponsor?.name ?? "seu padrinho"}</strong> aceitar
          apadrinhar seu perfil — assim que aceitar, seu acesso é liberado na hora. Depois disso, a
          administração confirma sua permanência em até 48h.
        </p>
      )}
    </main>
  );
}
