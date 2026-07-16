import { NextResponse, type NextRequest } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";

type AsaasWebhookPayload = {
  id: string;
  event: string;
  payment?: {
    id: string;
    status: string;
    subscription?: string;
  };
};

const PAID_EVENTS = new Set(["PAYMENT_CONFIRMED", "PAYMENT_RECEIVED"]);
const OVERDUE_EVENTS = new Set(["PAYMENT_OVERDUE"]);
const CANCELLED_EVENTS = new Set(["PAYMENT_DELETED", "PAYMENT_REFUNDED"]);

export async function POST(request: NextRequest) {
  const token = request.headers.get("asaas-access-token");
  if (token !== process.env.ASAAS_WEBHOOK_TOKEN) {
    return NextResponse.json({ error: "invalid token" }, { status: 401 });
  }

  const payload = (await request.json()) as AsaasWebhookPayload;
  const supabase = createServiceClient();

  const { error: insertError } = await supabase
    .from("payment_webhook_events")
    .insert({ id: payload.id, event_type: payload.event });

  if (insertError) {
    // Chave duplicada (23505) = evento já processado (Asaas garante "at least
    // once") — idempotente, pode ignorar. Qualquer OUTRO erro (ex.: service
    // role mal configurada) NÃO pode ser mascarado como sucesso: retorna 500
    // pro Asaas reenviar, e loga — senão o pagamento some silenciosamente
    // (foi exatamente o que mascarou o bug da SUPABASE_SERVICE_ROLE_KEY).
    if (insertError.code === "23505") {
      return NextResponse.json({ ok: true, duplicate: true });
    }
    console.error("Webhook Asaas: falha ao registrar evento", insertError);
    return NextResponse.json({ error: "internal error" }, { status: 500 });
  }

  const payment = payload.payment;
  if (!payment) {
    return NextResponse.json({ ok: true });
  }

  if (payment.subscription) {
    if (PAID_EVENTS.has(payload.event)) {
      await supabase
        .from("subscriptions")
        .update({ status: "active", renewed_at: new Date().toISOString(), overdue_since: null })
        .eq("asaas_subscription_id", payment.subscription);
    } else if (OVERDUE_EVENTS.has(payload.event)) {
      // Só grava overdue_since se ainda não estava vencida — não resetar a
      // contagem de carência a cada nova notificação do mesmo vencimento.
      const { data: current } = await supabase
        .from("subscriptions")
        .select("overdue_since")
        .eq("asaas_subscription_id", payment.subscription)
        .maybeSingle();

      await supabase
        .from("subscriptions")
        .update({ status: "overdue", overdue_since: current?.overdue_since ?? new Date().toISOString() })
        .eq("asaas_subscription_id", payment.subscription);
    } else if (CANCELLED_EVENTS.has(payload.event)) {
      await supabase
        .from("subscriptions")
        .update({ status: "cancelled" })
        .eq("asaas_subscription_id", payment.subscription);
    }
  } else {
    let paymentStatus: string | null = null;
    if (PAID_EVENTS.has(payload.event)) paymentStatus = "paid";
    else if (OVERDUE_EVENTS.has(payload.event)) paymentStatus = "overdue";
    else if (CANCELLED_EVENTS.has(payload.event)) paymentStatus = "cancelled";

    if (paymentStatus) {
      await supabase
        .from("event_registrations")
        .update({ payment_status: paymentStatus })
        .eq("asaas_payment_id", payment.id);
    }
  }

  return NextResponse.json({ ok: true });
}
