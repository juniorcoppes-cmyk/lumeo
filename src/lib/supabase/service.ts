import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * Bypassa RLS — service_role. Só para contextos de confiança sem sessão de
 * usuário (ex.: webhook do Asaas validado por token). Nunca usar em código
 * que responde a uma requisição de um usuário autenticado comum.
 */
export function createServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  // Falha com mensagem clara nomeando a variável ausente — em vez do genérico
  // "supabaseKey is required" do SDK, que dificulta o diagnóstico (ex.: no
  // webhook do Asaas, um 500 opaco que só aparecia no log da Vercel).
  if (!url || !key) {
    const faltando = [!url && "NEXT_PUBLIC_SUPABASE_URL", !key && "SUPABASE_SERVICE_ROLE_KEY"]
      .filter(Boolean)
      .join(", ");
    throw new Error(`Supabase service client não configurado — variável(is) ausente(s): ${faltando}`);
  }

  return createSupabaseClient(url, key, { auth: { persistSession: false } });
}
