const ASAAS_API_URL = process.env.ASAAS_API_URL ?? "https://api-sandbox.asaas.com/v3";

async function asaasFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${ASAAS_API_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      "User-Agent": "Lumeo",
      access_token: process.env.ASAAS_API_KEY!,
      ...init?.headers,
    },
  });

  const body = await res.json();
  if (!res.ok) {
    throw new Error(`Asaas ${path} failed (${res.status}): ${JSON.stringify(body)}`);
  }
  return body as T;
}

export type AsaasCustomer = { id: string };

export async function findOrCreateCustomer(params: {
  name: string;
  cpfCnpj: string;
  email: string;
  externalReference: string;
}): Promise<AsaasCustomer> {
  const existing = await asaasFetch<{ data: AsaasCustomer[] }>(
    `/customers?cpfCnpj=${encodeURIComponent(params.cpfCnpj)}`,
  );
  if (existing.data.length > 0) return existing.data[0];

  return asaasFetch<AsaasCustomer>("/customers", {
    method: "POST",
    body: JSON.stringify(params),
  });
}

export type AsaasBillingType = "BOLETO" | "PIX" | "CREDIT_CARD" | "UNDEFINED";

export type AsaasSubscription = {
  id: string;
  status: string;
};

export async function createSubscription(params: {
  customer: string;
  billingType: AsaasBillingType;
  value: number;
  nextDueDate: string;
  cycle: "MONTHLY";
  description: string;
  externalReference: string;
}): Promise<AsaasSubscription> {
  return asaasFetch<AsaasSubscription>("/subscriptions", {
    method: "POST",
    body: JSON.stringify(params),
  });
}

export async function getSubscriptionFirstPaymentUrl(subscriptionId: string): Promise<string | null> {
  const result = await asaasFetch<{ data: { invoiceUrl: string }[] }>(
    `/subscriptions/${subscriptionId}/payments`,
  );
  return result.data[0]?.invoiceUrl ?? null;
}

export type AsaasPayment = {
  id: string;
  status: string;
  invoiceUrl: string;
};

export async function createPayment(params: {
  customer: string;
  billingType: AsaasBillingType;
  value: number;
  dueDate: string;
  description: string;
  externalReference: string;
}): Promise<AsaasPayment> {
  return asaasFetch<AsaasPayment>("/payments", {
    method: "POST",
    body: JSON.stringify(params),
  });
}
