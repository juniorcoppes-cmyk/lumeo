import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * Bypassa RLS — service_role. Só para contextos de confiança sem sessão de
 * usuário (ex.: webhook do Asaas validado por token). Nunca usar em código
 * que responde a uma requisição de um usuário autenticado comum.
 */
export function createServiceClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );
}
