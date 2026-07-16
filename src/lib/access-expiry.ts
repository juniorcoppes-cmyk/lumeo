import { effectiveSubscriptionStatus } from "@/lib/subscription";

const TRIAL_DAYS = 7;
const DAY_MS = 24 * 60 * 60 * 1000;
const WARN_FROM_DAYS = 3; // avisa faltando 3, 2, 1 e no próprio dia

export type AccessExpiryKind = "trial" | "subscription" | "exemption";
export type AccessExpiry = { kind: AccessExpiryKind; daysLeft: number } | null;

type SubscriptionRow = {
  status: string;
  renewed_at: string | null;
  overdue_since: string | null;
} | null;

/**
 * Quantos dias faltam pro acesso do usuário vencer. Cobre os três jeitos de
 * ter acesso: isenção com prazo (ex.: testers liberados por 30 dias), teste
 * grátis de 7 dias, e mensalidade. Retorna null quando não é caso de avisar
 * (falta muito, já venceu, ou o acesso não expira).
 *
 * Recebe os campos crus de propósito: a decisão de "quem é isento" mora aqui,
 * não na página — assim um chamador novo não esquece de tratar um caso.
 */
export function computeAccessExpiry(params: {
  /** admin/suporte: acesso não expira, nunca avisa */
  isAdminOrSupport: boolean;
  subscriptionExempt: boolean;
  /** null = isenção sem prazo (não expira, não avisa) */
  subscriptionExemptUntil: string | null | undefined;
  memberSince: string | null | undefined;
  subscription: SubscriptionRow | undefined;
}): AccessExpiry {
  if (params.isAdminOrSupport) return null;

  if (params.subscriptionExempt) {
    // Isenção sem prazo não expira — nada a avisar.
    if (!params.subscriptionExemptUntil) return null;
    const until = new Date(params.subscriptionExemptUntil);
    // Só conta enquanto a isenção ainda vale; se já venceu, cai nos casos
    // abaixo (que é o que has_contact_access() também faz).
    if (until.getTime() > Date.now()) return within(until, "exemption");
  }

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

function within(end: Date, kind: AccessExpiryKind): AccessExpiry {
  const daysLeft = Math.ceil((end.getTime() - Date.now()) / DAY_MS);
  if (daysLeft < 0 || daysLeft > WARN_FROM_DAYS) return null;
  return { kind, daysLeft };
}
