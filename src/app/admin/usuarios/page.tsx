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

      <div className="mt-6 overflow-x-auto">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead>
            <tr className="border-b border-line text-muted">
              <th className="whitespace-nowrap py-2 pr-4">Nome</th>
              <th className="whitespace-nowrap py-2 pr-4">E-mail</th>
              <th className="whitespace-nowrap py-2 pr-4">Perfil</th>
              <th className="whitespace-nowrap py-2 pr-4">Selo</th>
              <th className="whitespace-nowrap py-2 pr-4">Admin</th>
              <th className="whitespace-nowrap py-2">Isenção de assinatura</th>
            </tr>
          </thead>
          <tbody>
            {users?.map((u) => (
              <tr key={u.id} className="border-b border-line">
                <td className="py-2 pr-4">{u.name}</td>
                <td className="py-2 pr-4">{u.email}</td>
                <td className="py-2 pr-4">{u.profile_type}</td>
                <td className="py-2 pr-4">{u.verification_badge_id ?? "—"}</td>
                <td className="py-2 pr-4">
                  <form action={setAdmin}>
                    <input type="hidden" name="user_id" value={u.id} />
                    <input type="hidden" name="is_admin" value={String(u.is_admin)} />
                    <button type="submit" className="btn-secondary !px-2.5 !py-1 !text-xs whitespace-nowrap">
                      {u.is_admin ? "Remover admin" : "Tornar admin"}
                    </button>
                  </form>
                </td>
                <td className="py-2">
                  {u.subscription_exempt ? (
                    <div className="flex flex-col items-start gap-1">
                      <span className="tag whitespace-nowrap">
                        {u.subscription_exempt_until
                          ? `Isento até ${new Date(u.subscription_exempt_until).toLocaleDateString("pt-BR")}`
                          : "Isento (sem prazo)"}
                      </span>
                      <form action={setSubscriptionExempt}>
                        <input type="hidden" name="user_id" value={u.id} />
                        <input type="hidden" name="exempt_action" value="revoke" />
                        <button type="submit" className="btn-secondary !px-2.5 !py-1 !text-xs whitespace-nowrap">
                          Remover isenção
                        </button>
                      </form>
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-1">
                      <form action={setSubscriptionExempt}>
                        <input type="hidden" name="user_id" value={u.id} />
                        <input type="hidden" name="exempt_action" value="30_dias" />
                        <button type="submit" className="btn-secondary !px-2.5 !py-1 !text-xs whitespace-nowrap">
                          Isentar 30 dias
                        </button>
                      </form>
                      <form action={setSubscriptionExempt}>
                        <input type="hidden" name="user_id" value={u.id} />
                        <input type="hidden" name="exempt_action" value="indefinido" />
                        <button type="submit" className="btn-secondary !px-2.5 !py-1 !text-xs whitespace-nowrap">
                          Isentar até revogar
                        </button>
                      </form>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
