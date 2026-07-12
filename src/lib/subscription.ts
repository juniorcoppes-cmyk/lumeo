const GRACE_PERIOD_DAYS = 2;

/**
 * "overdue" só vira "suspended" depois da carência (pendência 3 da
 * especificação). Calculado na leitura em vez de um job agendado.
 */
export function effectiveSubscriptionStatus(
  status: string,
  overdueSince: string | null,
): string {
  if (status !== "overdue" || !overdueSince) return status;

  const gracePeriodEnds = new Date(overdueSince).getTime() + GRACE_PERIOD_DAYS * 24 * 60 * 60 * 1000;
  return Date.now() > gracePeriodEnds ? "suspended" : "overdue";
}
