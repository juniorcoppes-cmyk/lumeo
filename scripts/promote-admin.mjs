// Promove um usuário existente a admin (users.is_admin = true).
// Uso: node scripts/promote-admin.mjs email@exemplo.com
//
// Só existe porque não há UI para criar o primeiro admin (toda a UI de
// admin/usuarios já exige ser admin para acessar). Roda com a service role
// key, então bypassa RLS de propósito — nunca rodar isso a partir de código
// que atende requisição de usuário comum.

import nextEnv from "@next/env";
import { createClient } from "@supabase/supabase-js";

const { loadEnvConfig } = nextEnv;

async function main() {
  loadEnvConfig(process.cwd());

  const email = process.argv[2];
  if (!email) {
    console.error("Uso: node scripts/promote-admin.mjs email@exemplo.com");
    return 1;
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) {
    console.error(
      "NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY precisam estar definidos em .env.local",
    );
    return 1;
  }

  const supabase = createClient(url, serviceRoleKey, {
    auth: { persistSession: false },
  });

  const { data, error } = await supabase
    .from("users")
    .update({ is_admin: true })
    .eq("email", email)
    .select("id, name, email")
    .maybeSingle();

  if (error) {
    console.error("Erro ao promover usuário:", error.message);
    return 1;
  }

  if (!data) {
    console.error(
      `Nenhum usuário com email ${email} encontrado (precisa já ter feito cadastro).`,
    );
    return 1;
  }

  console.log(`${data.name} <${data.email}> agora é admin.`);
  return 0;
}

process.exitCode = await main();
