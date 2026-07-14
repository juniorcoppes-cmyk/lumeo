import { createClient } from "@/lib/supabase/server";
import { getPlans } from "@/lib/plans";

export default async function PlanosPage() {
  const supabase = await createClient();
  const plans = await getPlans(supabase);

  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="text-3xl">Planos</h1>
      <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2">
        {plans.map((plan) => (
          <div key={plan.id} className="card">
            <h2 className="text-xl">{plan.name}</h2>
            <p className="mt-2 text-accent font-medium">R$ {plan.price.toFixed(2)} / mês</p>
            <ul className="mt-4 flex flex-col gap-2 text-sm text-muted">
              {plan.features.map((feature) => (
                <li key={feature} className="flex gap-2">
                  <span aria-hidden>·</span>
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </main>
  );
}
