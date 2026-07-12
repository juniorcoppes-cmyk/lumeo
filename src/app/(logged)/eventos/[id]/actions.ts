"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createPayment, findOrCreateCustomer } from "@/lib/asaas";

export async function inscrever(formData: FormData) {
  const eventId = formData.get("event_id") as string;
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
    redirect(`/eventos/${eventId}?error=${encodeURIComponent("Informe seu CPF para continuar")}`);
  }

  let registrationError: string | null = null;

  try {
    const { data: event } = await supabase
      .from("events")
      .select("title, price")
      .eq("id", eventId)
      .single();

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

    let asaasPaymentId: string | null = null;
    let paymentUrl: string | null = null;

    if (Number(event!.price) > 0) {
      const payment = await createPayment({
        customer: asaasCustomerId,
        billingType: "UNDEFINED",
        value: Number(event!.price),
        dueDate: new Date().toISOString().slice(0, 10),
        description: `Lumeo — inscrição em ${event!.title}`,
        externalReference: `${eventId}:${user.id}`,
      });
      asaasPaymentId = payment.id;
      paymentUrl = payment.invoiceUrl;
    }

    const { error } = await supabase.from("event_registrations").insert({
      event_id: eventId,
      user_id: user.id,
      status: "pending",
      payment_status: asaasPaymentId ? "pending" : "not_required",
      asaas_payment_id: asaasPaymentId,
      payment_url: paymentUrl,
    });

    registrationError = error?.message ?? null;
  } catch (err) {
    registrationError = err instanceof Error ? err.message : "Erro ao processar inscrição";
  }

  if (registrationError) {
    redirect(`/eventos/${eventId}?error=${encodeURIComponent(registrationError)}`);
  }

  revalidatePath(`/eventos/${eventId}`);
}

export async function convidarPorSelo(formData: FormData) {
  const eventId = formData.get("event_id") as string;
  const badgeId = (formData.get("badge_id") as string)?.trim();
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: invitee } = await supabase
    .from("users")
    .select("id")
    .eq("verification_badge_id", badgeId)
    .maybeSingle();

  if (!invitee) {
    redirect(`/eventos/${eventId}?error=${encodeURIComponent("Selo não encontrado")}`);
  }

  await supabase.from("event_invites").insert({
    event_id: eventId,
    inviter_id: user.id,
    invitee_id: invitee!.id,
  });

  revalidatePath(`/eventos/${eventId}`);
}

export async function gerarLinkConvite(formData: FormData) {
  const eventId = formData.get("event_id") as string;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  await supabase.from("event_invites").insert({
    event_id: eventId,
    inviter_id: user.id,
  });

  revalidatePath(`/eventos/${eventId}`);
}
