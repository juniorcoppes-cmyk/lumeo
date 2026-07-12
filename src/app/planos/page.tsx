const PLANS = [
  { id: "essencial", name: "Essencial", price: "R$ 34,90" },
  { id: "plus", name: "Plus", price: "R$ 59,90" },
];

export default function PlanosPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="text-3xl font-semibold">Planos</h1>
      <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2">
        {PLANS.map((plan) => (
          <div key={plan.id} className="rounded-lg border p-6">
            <h2 className="text-xl font-medium">{plan.name}</h2>
            <p className="mt-2 text-neutral-600">{plan.price} / mês</p>
          </div>
        ))}
      </div>
    </main>
  );
}
