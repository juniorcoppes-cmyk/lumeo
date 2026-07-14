import { createClient } from "@/lib/supabase/server";
import { setAdmin, setSubscriptionExempt } from "./actions";

export default async function AdminUsuariosPage() {
  const supabase = await createClient();

  const { data: users } = await supabase
    .from("users")
    .select(
      "id, name, email, profile_type, is_admin, verification_badge_id, subscription_exempt, created_at",
    )
    .order("created_at", { ascending: false });

  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="text-2xl">Usuários (admin)</h1>

      <table className="mt-6 w-full text-left text-sm">
        <thead>
          <tr className="border-b border-line text-muted">
            <th className="py-2">Nome</th>
            <th className="py-2">E-mail</th>
            <th className="py-2">Perfil</th>
            <th className="py-2">Selo</th>
            <th className="py-2">Admin</th>
            <th className="py-2">Isento de assinatura</th>
          </tr>
        </thead>
        <tbody>
          {users?.map((u) => (
            <tr key={u.id} className="border-b border-line">
              <td className="py-2">{u.name}</td>
              <td className="py-2">{u.email}</td>
              <td className="py-2">{u.profile_type}</td>
              <td className="py-2">{u.verification_badge_id ?? "—"}</td>
              <td className="py-2">
                <form action={setAdmin}>
                  <input type="hidden" name="user_id" value={u.id} />
                  <input type="hidden" name="is_admin" value={String(u.is_admin)} />
                  <button type="submit" className="btn-secondary !px-2.5 !py-1 !text-xs">
                    {u.is_admin ? "Remover admin" : "Tornar admin"}
                  </button>
                </form>
              </td>
              <td className="py-2">
                <form action={setSubscriptionExempt}>
                  <input type="hidden" name="user_id" value={u.id} />
                  <input
                    type="hidden"
                    name="subscription_exempt"
                    value={String(u.subscription_exempt)}
                  />
                  <button type="submit" className="btn-secondary !px-2.5 !py-1 !text-xs">
                    {u.subscription_exempt ? "Remover isenção" : "Isentar"}
                  </button>
                </form>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}
