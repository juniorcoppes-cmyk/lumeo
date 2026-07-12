import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { toggleDiscreetMode } from "./actions";

export default async function PerfilPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("users")
    .select("name, email, profile_type, verification_badge_id, discreet_mode")
    .eq("id", user.id)
    .single();

  const { data: subscription } = await supabase
    .from("subscriptions")
    .select("plan, status")
    .eq("user_id", user.id)
    .maybeSingle();

  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="text-2xl font-semibold">Perfil</h1>

      <dl className="mt-6 flex flex-col gap-2 text-sm">
        <div>
          <dt className="text-neutral-500">Nome</dt>
          <dd>{profile?.name}</dd>
        </div>
        <div>
          <dt className="text-neutral-500">E-mail</dt>
          <dd>{profile?.email}</dd>
        </div>
        <div>
          <dt className="text-neutral-500">Perfil</dt>
          <dd>{profile?.profile_type}</dd>
        </div>
        <div>
          <dt className="text-neutral-500">Selo de verificação</dt>
          <dd>{profile?.verification_badge_id ?? "Ainda não emitido"}</dd>
        </div>
        <div>
          <dt className="text-neutral-500">Plano atual</dt>
          <dd>{subscription ? `${subscription.plan} (${subscription.status})` : "Nenhum plano ativo"}</dd>
        </div>
      </dl>

      <form action={toggleDiscreetMode} className="mt-8 flex items-center gap-2">
        <input
          type="checkbox"
          id="discreet_mode"
          name="discreet_mode"
          defaultChecked={profile?.discreet_mode ?? false}
        />
        <label htmlFor="discreet_mode" className="text-sm">
          Modo de navegação discreta
        </label>
        <button type="submit" className="ml-4 rounded border px-3 py-1 text-sm">
          Salvar
        </button>
      </form>
    </main>
  );
}
