"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { cancelSubscription, createSubscription, findOrCreateCustomer } from "@/lib/asaas";

const PLAN_PRICES: Record<string, number> = {
  essencial: 34.9,
  plus: 59.9,
};

export async function choosePlan(formData: FormData) {
  const plan = formData.get("plan") as string;
  const cpfCnpj = (formData.get("cpf_cnpj") as string)?.replace(/\D/g, "");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: billing } = await supabase
    .from("billing_profiles")
    .select("asaas_customer_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!billing?.asaas_customer_id && !cpfCnpj) {
    redirect(`/assinatura?error=${encodeURIComponent("Informe seu CPF para continuar")}`);
  }

  const { data: existingSubscription } = await supabase
    .from("subscriptions")
    .select("plan, asaas_subscription_id")
    .eq("user_id", user.id)
    .maybeSingle();

  try {
    // Trocar de plano (ou tentar de novo) sem cancelar a assinatura antiga
    // no Asaas deixava as duas ativas ao mesmo tempo, cobrando as duas —
    // bug encontrado ao reproduzir o relato do fundador. Cancela a antiga
    // antes de criar a nova.
    if (existingSubscription?.asaas_subscription_id) {
      await cancelSubscription(existingSubscription.asaas_subscription_id).catch(() => {
        // já cancelada/inexistente no Asaas não deve travar a troca de plano.
      });
    }

    const { data: profile } = await supabase
      .from("users")
      .select("name, email")
      .eq("id", user.id)
      .single();

    let asaasCustomerId = billing?.asaas_customer_id as string | undefined;

    if (!asaasCustomerId) {
      const customer = await findOrCreateCustomer({
        name: profile!.name,
        cpfCnpj,
        email: profile!.email,
        externalReference: user.id,
      });
      asaasCustomerId = customer.id;

      await supabase
        .from("billing_profiles")
        .upsert({ user_id: user.id, cpf_cnpj: cpfCnpj, asaas_customer_id: asaasCustomerId }, { onConflict: "user_id" });
    }

    const nextDueDate = new Date().toISOString().slice(0, 10);

    const subscription = await createSubscription({
      customer: asaasCustomerId,
      billingType: "UNDEFINED",
      value: PLAN_PRICES[plan],
      nextDueDate,
      cycle: "MONTHLY",
      description: `Lumeo — plano ${plan}`,
      externalReference: user.id,
    });

    await supabase.from("subscriptions").upsert(
      {
        user_id: user.id,
        plan,
        status: "pending_payment",
        asaas_subscription_id: subscription.id,
      },
      { onConflict: "user_id" },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro ao criar assinatura";
    redirect(`/assinatura?error=${encodeURIComponent(message)}`);
  }

  revalidatePath("/assinatura");
}
