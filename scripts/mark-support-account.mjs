// Marca um usuário existente como a conta fixa do canal de suporte "ADM"
// (users.is_support_channel = true). Só deve existir uma; o script tira o
// flag de qualquer outra conta antes de marcar a nova, pra nunca ter duas.
// Uso: node scripts/mark-support-account.mjs email@exemplo.com
//
// O nome exibido ("ADM") vem do campo `name` da própria conta, escolhido
// no cadastro normal — este script só liga o flag que faz contact_admin()
// encontrá-la.

import nextEnv from "@next/env";
import { createClient } from "@supabase/supabase-js";

const { loadEnvConfig } = nextEnv;

async function main() {
  loadEnvConfig(process.cwd());

  const email = process.argv[2];
  if (!email) {
    console.error("Uso: node scripts/mark-support-account.mjs email@exemplo.com");
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

  await supabase.from("users").update({ is_support_channel: false }).eq("is_support_channel", true);

  const { data, error } = await supabase
    .from("users")
    .update({ is_support_channel: true })
    .eq("email", email)
    .select("id, name, email")
    .maybeSingle();

  if (error) {
    console.error("Erro ao marcar conta de suporte:", error.message);
    return 1;
  }

  if (!data) {
    console.error(
      `Nenhum usuário com email ${email} encontrado (precisa já ter feito cadastro).`,
    );
    return 1;
  }

  console.log(`${data.name} <${data.email}> agora é a conta do canal de suporte.`);
  return 0;
}

process.exitCode = await main();
