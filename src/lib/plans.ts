import { createClient } from "@/lib/supabase/server";

export type Plan = {
  id: string;
  name: string;
  price: number;
  features: string[];
};

// Preço/nome/features ficam na tabela `plans` (editável pelo admin em
// /admin/planos) — único lugar de verdade, usado tanto pra exibir quanto
// pra cobrar de fato no Asaas (ver assinatura/actions.ts).
export async function getPlans(supabase: Awaited<ReturnType<typeof createClient>>): Promise<Plan[]> {
  const { data } = await supabase
    .from("plans")
    .select("id, name, price, features")
    .order("price", { ascending: true });

  return (data ?? []).map((p) => ({ ...p, price: Number(p.price) }));
}
