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

  // DIAGNÓSTICO TEMPORÁRIO (remover depois): mostra quais env vars a função
  // enxerga em runtime — só nomes e tamanhos, nunca valores. Protegido pelo
  // token acima. Serve pra achar por que SUPABASE_SERVICE_ROLE_KEY chega
  // undefined apesar de estar no dashboard da Vercel.
  if (new URL(request.url).searchParams.get("diag") === "env") {
    const info = (v?: string) => ({ defined: v !== undefined && v !== "", len: (v ?? "").length });
    return NextResponse.json({
      matchingKeys: Object.keys(process.env).filter((k) => /SUPABASE|ASAAS/.test(k)).sort(),
      SUPABASE_SERVICE_ROLE_KEY: info(process.env.SUPABASE_SERVICE_ROLE_KEY),
      NEXT_PUBLIC_SUPABASE_URL: info(process.env.NEXT_PUBLIC_SUPABASE_URL),
      NEXT_PUBLIC_SUPABASE_ANON_KEY: info(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
      ASAAS_WEBHOOK_TOKEN: info(process.env.ASAAS_WEBHOOK_TOKEN),
    });
  }

  const payload = (await request.json()) as AsaasWebhookPayload;
  const supabase = createServiceClient();

  const { error: insertError } = await supabase
    .from("payment_webhook_events")
    .insert({ id: payload.id, event_type: payload.event });

  if (insertError) {
    // Já processado (chave duplicada) — Asaas garante "at least once".
    return NextResponse.json({ ok: true, duplicate: true });
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
