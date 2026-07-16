import { createClient } from "@/lib/supabase/server";
import { setAdmin, setSubscriptionExempt } from "./actions";

export default async function AdminUsuariosPage() {
  const supabase = await createClient();

  const { data: users } = await supabase
    .from("users")
    .select(
      "id, name, email, profile_type, is_admin, verification_badge_id, subscription_exempt, subscription_exempt_until, created_at",
    )
    .order("created_at", { ascending: false });

  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="text-2xl">Usuários (admin)</h1>

      {/* Cards em vez de tabela: a tabela tinha min-w de 640px dentro de um
          overflow-x-auto, então no celular a coluna de isenção (a última)
          ficava centenas de pixels fora da tela, sem nenhuma pista de que dava
          pra arrastar — o fundador simplesmente não achava o botão. Mesma
          lição da nav: melhor ocupar altura do que esconder ação. */}
      <ul className="mt-6 flex flex-col gap-3">
        {users?.map((u) => (
          <li key={u.id} className="card">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <span className="font-medium text-foreground">{u.name}</span>
              {u.is_admin && <span className="tag">admin</span>}
              {u.subscription_exempt && (
                <span className="tag">
                  {u.subscription_exempt_until
                    ? `Isento até ${new Date(u.subscription_exempt_until).toLocaleDateString("pt-BR")}`
                    : "Isento (sem prazo)"}
                </span>
              )}
            </div>
            <p className="mt-1 break-all text-xs text-muted">{u.email}</p>
            <p className="mt-0.5 text-xs text-muted">
              {u.profile_type} · selo: {u.verification_badge_id ?? "—"}
            </p>

            <div className="mt-3 flex flex-wrap gap-2">
              <form action={setAdmin}>
                <input type="hidden" name="user_id" value={u.id} />
                <input type="hidden" name="is_admin" value={String(u.is_admin)} />
                <button type="submit" className="btn-secondary !px-2.5 !py-1 !text-xs">
                  {u.is_admin ? "Remover admin" : "Tornar admin"}
                </button>
              </form>

              {u.subscription_exempt ? (
                <form action={setSubscriptionExempt}>
                  <input type="hidden" name="user_id" value={u.id} />
                  <input type="hidden" name="exempt_action" value="revoke" />
                  <button type="submit" className="btn-secondary !px-2.5 !py-1 !text-xs">
                    Remover isenção
                  </button>
                </form>
              ) : (
                <>
                  <form action={setSubscriptionExempt}>
                    <input type="hidden" name="user_id" value={u.id} />
                    <input type="hidden" name="exempt_action" value="30_dias" />
                    <button type="submit" className="btn-secondary !px-2.5 !py-1 !text-xs">
                      Isentar 30 dias
                    </button>
                  </form>
                  <form action={setSubscriptionExempt}>
                    <input type="hidden" name="user_id" value={u.id} />
                    <input type="hidden" name="exempt_action" value="indefinido" />
                    <button type="submit" className="btn-secondary !px-2.5 !py-1 !text-xs">
                      Isentar até revogar
                    </button>
                  </form>
                </>
              )}
            </div>
          </li>
        ))}
        {users?.length === 0 && <p className="text-muted">Nenhum usuário ainda.</p>}
      </ul>
    </main>
  );
}
