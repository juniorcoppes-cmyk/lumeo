import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSubscriptionFirstPaymentUrl } from "@/lib/asaas";
import { PLANS } from "@/lib/plans";
import { effectiveSubscriptionStatus } from "@/lib/subscription";
import { choosePlan } from "./actions";

export default async function AssinaturaPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: subscription } = await supabase
    .from("subscriptions")
    .select("plan, status, asaas_subscription_id, overdue_since")
    .eq("user_id", user.id)
    .maybeSingle();

  const displayStatus = subscription
    ? effectiveSubscriptionStatus(subscription.status, subscription.overdue_since)
    : null;

  const { data: billing } = await supabase
    .from("billing_profiles")
    .select("cpf_cnpj")
    .eq("user_id", user.id)
    .maybeSingle();

  const paymentUrl =
    subscription?.status === "pending_payment" && subscription.asaas_subscription_id
      ? await getSubscriptionFirstPaymentUrl(subscription.asaas_subscription_id).catch(() => null)
      : null;

  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="text-2xl font-semibold">Assinatura</h1>

      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

      {subscription ? (
        <p className="mt-2 text-neutral-600">
          Plano atual: <strong>{subscription.plan}</strong> ({displayStatus})
        </p>
      ) : (
        <p className="mt-2 text-neutral-600">Nenhum plano escolhido ainda.</p>
      )}

      {displayStatus === "overdue" && (
        <p className="mt-2 text-sm text-amber-600">
          Pagamento em atraso — você tem 2 dias de carência a partir do
          vencimento antes do acesso ser suspenso.
        </p>
      )}
      {displayStatus === "suspended" && (
        <p className="mt-2 text-sm text-red-600">
          Assinatura suspensa por falta de pagamento. Regularize para
          continuar.
        </p>
      )}

      {paymentUrl && (
        <p className="mt-2 text-sm">
          <a href={paymentUrl} target="_blank" rel="noreferrer" className="underline">
            Finalizar pagamento
          </a>
        </p>
      )}

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        {PLANS.map((plan) => (
          <form key={plan.id} action={choosePlan} className="rounded-lg border p-6">
            <input type="hidden" name="plan" value={plan.id} />
            <h2 className="text-xl font-medium">{plan.name}</h2>
            <p className="mt-2 text-neutral-600">{plan.price} / mês</p>
            <ul className="mt-3 flex flex-col gap-1 text-sm text-neutral-600">
              {plan.features.map((feature) => (
                <li key={feature} className="flex gap-2">
                  <span aria-hidden>·</span>
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
            {!billing?.cpf_cnpj && (
              <input
                type="text"
                name="cpf_cnpj"
                placeholder="CPF"
                required
                className="mt-3 w-full rounded border px-3 py-2 text-sm"
              />
            )}
            <button type="submit" className="mt-4 rounded bg-black px-4 py-2 text-white">
              {subscription?.plan === plan.id ? "Trocar/atualizar" : "Escolher"}
            </button>
          </form>
        ))}
      </div>
    </main>
  );
}
