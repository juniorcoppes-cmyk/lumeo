import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getUser } from "@/lib/supabase/get-user";
import { getSubscriptionFirstPaymentUrl } from "@/lib/asaas";
import { getPlans } from "@/lib/plans";
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
  } = await getUser();
  if (!user) redirect("/login");

  const { data: subscription } = await supabase
    .from("subscriptions")
    .select("plan, status, asaas_subscription_id, overdue_since")
    .eq("user_id", user.id)
    .maybeSingle();

  const displayStatus = subscription
    ? effectiveSubscriptionStatus(subscription.status, subscription.overdue_since)
    : null;

  const { data: profile } = await supabase
    .from("users")
    .select("is_admin, is_support_channel")
    .eq("id", user.id)
    .single();

  const { data: approvedVerification } = await supabase
    .from("verifications")
    .select("reviewed_at")
    .eq("user_id", user.id)
    .eq("status", "approved")
    .order("reviewed_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const trialDaysLeft = approvedVerification?.reviewed_at
    ? Math.ceil(
        7 -
          (Date.now() - new Date(approvedVerification.reviewed_at).getTime()) /
            (24 * 60 * 60 * 1000),
      )
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

  const plans = await getPlans(supabase);

  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="text-2xl">Assinatura</h1>

      {error && <p className="mt-4 text-sm text-red-400">{error}</p>}

      {profile?.is_admin || profile?.is_support_channel ? (
        <p className="mt-2 text-muted">
          Conta administrativa — acesso completo, sem necessidade de assinatura.
        </p>
      ) : subscription ? (
        <p className="mt-2 text-muted">
          Plano atual: <strong className="text-foreground">{subscription.plan}</strong> ({displayStatus})
        </p>
      ) : trialDaysLeft !== null && trialDaysLeft > 0 ? (
        <p className="mt-2 text-muted">
          Você está no período de teste gratuito —{" "}
          <strong className="text-foreground">
            {trialDaysLeft} {trialDaysLeft === 1 ? "dia restante" : "dias restantes"}
          </strong>{" "}
          com acesso completo. Depois disso, contato direto com outros
          perfis exige um plano ativo.
        </p>
      ) : trialDaysLeft !== null ? (
        <p className="mt-2 text-sm text-on-accent-soft">
          Seu período de teste gratuito acabou. Assine um plano para
          continuar entrando em contato com outros perfis.
        </p>
      ) : (
        <p className="mt-2 text-muted">Nenhum plano escolhido ainda.</p>
      )}

      {displayStatus === "overdue" && (
        <p className="mt-2 text-sm text-on-accent-soft">
          Pagamento em atraso — você tem 2 dias de carência a partir do
          vencimento antes do acesso ser suspenso.
        </p>
      )}
      {displayStatus === "suspended" && (
        <p className="mt-2 text-sm text-red-400">
          Assinatura suspensa por falta de pagamento. Regularize para
          continuar.
        </p>
      )}

      {paymentUrl && (
        <p className="mt-2 text-sm">
          <a href={paymentUrl} target="_blank" rel="noreferrer">
            Finalizar pagamento
          </a>
        </p>
      )}

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        {plans.map((plan) => {
          const isCurrentActivePlan = subscription?.plan === plan.id && displayStatus === "active";
          return (
            <form key={plan.id} action={choosePlan} className="card">
              <input type="hidden" name="plan" value={plan.id} />
              <h2 className="text-xl">{plan.name}</h2>
              <p className="mt-2 text-accent font-medium">R$ {plan.price.toFixed(2)} / mês</p>
              <ul className="mt-3 flex flex-col gap-1 text-sm text-muted">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex gap-2">
                    <span aria-hidden>·</span>
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
              {isCurrentActivePlan ? (
                <p className="mt-4 rounded-full border border-line px-4 py-2 text-center text-sm text-muted">
                  Seu plano atual
                </p>
              ) : (
                <>
                  {!billing?.cpf_cnpj && (
                    <input
                      type="text"
                      name="cpf_cnpj"
                      placeholder="CPF"
                      required
                      className="input mt-3 w-full text-sm"
                    />
                  )}
                  <button type="submit" className="btn-primary mt-4">
                    {subscription ? `Trocar para ${plan.name}` : "Escolher"}
                  </button>
                </>
              )}
            </form>
          );
        })}
      </div>
    </main>
  );
}
