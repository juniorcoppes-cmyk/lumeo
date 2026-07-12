import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { choosePlan } from "./actions";

const PLANS = [
  { id: "essencial", name: "Essencial", price: "R$ 34,90" },
  { id: "plus", name: "Plus", price: "R$ 59,90" },
];

export default async function AssinaturaPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: subscription } = await supabase
    .from("subscriptions")
    .select("plan, status")
    .eq("user_id", user.id)
    .maybeSingle();

  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="text-2xl font-semibold">Assinatura</h1>

      {subscription ? (
        <p className="mt-2 text-neutral-600">
          Plano atual: <strong>{subscription.plan}</strong> ({subscription.status})
        </p>
      ) : (
        <p className="mt-2 text-neutral-600">Nenhum plano escolhido ainda.</p>
      )}

      {subscription?.status === "pending_payment" && (
        <p className="mt-2 text-sm text-amber-600">
          Cobrança recorrente ainda não integrada — o plano fica reservado até
          o processador de pagamento ser definido.
        </p>
      )}

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        {PLANS.map((plan) => (
          <form key={plan.id} action={choosePlan} className="rounded-lg border p-6">
            <input type="hidden" name="plan" value={plan.id} />
            <h2 className="text-xl font-medium">{plan.name}</h2>
            <p className="mt-2 text-neutral-600">{plan.price} / mês</p>
            <button type="submit" className="mt-4 rounded bg-black px-4 py-2 text-white">
              {subscription?.plan === plan.id ? "Plano atual" : "Escolher"}
            </button>
          </form>
        ))}
      </div>
    </main>
  );
}
