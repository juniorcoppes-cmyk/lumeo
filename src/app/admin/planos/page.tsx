import { getPlans } from "@/lib/plans";
import { createClient } from "@/lib/supabase/server";
import { updatePlan } from "./actions";

export default async function AdminPlanosPage() {
  const supabase = await createClient();
  const plans = await getPlans(supabase);

  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="text-2xl font-semibold">Planos (admin)</h1>
      <p className="mt-2 text-sm text-neutral-600">
        Preço e descrição usados em /planos e /assinatura — inclusive o
        valor cobrado de verdade no Asaas.
      </p>

      <div className="mt-6 flex flex-col gap-6">
        {plans.map((plan) => (
          <form
            key={plan.id}
            action={updatePlan}
            className="flex flex-col gap-3 rounded-lg border p-4"
          >
            <input type="hidden" name="id" value={plan.id} />
            <h2 className="font-medium">{plan.id}</h2>
            <label className="flex flex-col gap-1 text-sm">
              Nome exibido
              <input
                type="text"
                name="name"
                defaultValue={plan.name}
                required
                className="rounded border px-3 py-2"
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
                className="rounded border px-3 py-2"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              Descrição (uma por linha)
              <textarea
                name="features"
                defaultValue={plan.features.join("\n")}
                rows={4}
                className="rounded border px-3 py-2"
              />
            </label>
            <button type="submit" className="self-start rounded bg-black px-4 py-2 text-white">
              Salvar
            </button>
          </form>
        ))}
      </div>
    </main>
  );
}
