import { getPlans } from "@/lib/plans";
import { createClient } from "@/lib/supabase/server";
import { updatePlan } from "./actions";

export default async function AdminPlanosPage() {
  const supabase = await createClient();
  const plans = await getPlans(supabase);

  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="text-2xl">Planos (admin)</h1>
      <p className="mt-2 text-sm text-muted">
        Preço e descrição usados em /planos e /assinatura — inclusive o
        valor cobrado de verdade no Asaas.
      </p>

      <div className="mt-6 flex flex-col gap-6">
        {plans.map((plan) => (
          <form
            key={plan.id}
            action={updatePlan}
            className="flex flex-col gap-3 card"
          >
            <input type="hidden" name="id" value={plan.id} />
            <h2 className="text-lg">{plan.id}</h2>
            <label className="flex flex-col gap-1 text-sm">
              Nome exibido
              <input
                type="text"
                name="name"
                defaultValue={plan.name}
                required
                className="input"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              Preço (R$/mês)
              <input
                type="number"
                name="price"
                defaultValue={plan.price}
                min={0.01}
                step="0.01"
                required
                className="input"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              Descrição (uma por linha)
              <textarea
                name="features"
                defaultValue={plan.features.join("\n")}
                rows={4}
                className="input"
              />
            </label>
            <button type="submit" className="btn-primary self-start">
              Salvar
            </button>
          </form>
        ))}
      </div>
    </main>
  );
}
