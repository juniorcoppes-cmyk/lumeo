-- Carência de pagamento (pendência 3 da especificação, seção 8): 2 dias de
-- tolerância entre a assinatura vencer (overdue) e ser tratada como suspensa.
-- overdue_since marca quando o vencimento começou; a suspensão em si é
-- calculada dinamicamente (status = 'overdue' e overdue_since há mais de
-- 2 dias) em vez de um job agendado, para não depender de infraestrutura
-- extra de cron.
alter table subscriptions add column if not exists overdue_since timestamptz;
