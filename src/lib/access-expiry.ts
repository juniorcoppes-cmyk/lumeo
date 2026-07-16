import { effectiveSubscriptionStatus } from "@/lib/subscription";

const TRIAL_DAYS = 7;
const DAY_MS = 24 * 60 * 60 * 1000;
const WARN_FROM_DAYS = 3; // avisa faltando 3, 2, 1 e no próprio dia

export type AccessExpiry = { kind: "trial" | "subscription"; daysLeft: number } | null;

type SubscriptionRow = {
  status: string;
  renewed_at: string | null;
  overdue_since: string | null;
} | null;

/**
 * Quantos dias faltam pro acesso do usuário vencer — seja o fim do período de
 * teste (quem ainda não assinou) ou o vencimento da mensalidade (quem assinou).
 * Retorna null quando não é caso de avisar (falta muito, já venceu, ou o
 * usuário é isento/admin).
 */
export function computeAccessExpiry(params: {
  memberSince: string | null | undefined;
  subscription: SubscriptionRow | undefined;
  exempt?: boolean;
}): AccessExpiry {
  if (params.exempt) return null;

  const sub = params.subscription;
  const isActive =
    !!sub && effectiveSubscriptionStatus(sub.status, sub.overdue_since) === "active";

  if (isActive && sub?.renewed_at) {
    // O app não guarda a data exata do próximo vencimento do Asaas; a
    // assinatura é mensal, então aproximamos por "último pagamento + 1 mês".
    // Se um dia precisarmos da data exata, dá pra guardar o nextDueDate do
    // Asaas no webhook em vez de calcular aqui.
    const next = new Date(sub.renewed_at);
    next.setMonth(next.getMonth() + 1);
    return within(next, "subscription");
  }

  if (params.memberSince) {
    const end = new Date(params.memberSince);
    end.setDate(end.getDate() + TRIAL_DAYS);
    return within(end, "trial");
  }

  return null;
}

function within(end: Date, kind: "trial" | "subscription"): AccessExpiry {
  const daysLeft = Math.ceil((end.getTime() - Date.now()) / DAY_MS);
  if (daysLeft < 0 || daysLeft > WARN_FROM_DAYS) return null;
  return { kind, daysLeft };
}
