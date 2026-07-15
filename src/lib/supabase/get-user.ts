import { cache } from "react";
import { createClient } from "./server";

// Memoizado por requisição (React cache()) — o layout e a página de cada
// rota chamavam supabase.auth.getUser() cada um por conta própria, dobrando
// o número de idas e vindas de rede até o servidor de Auth do Supabase em
// toda navegação. Com isso, só a primeira chamada dentro de uma mesma
// requisição bate na rede; as demais reaproveitam o resultado.
export const getUser = cache(async () => {
  const supabase = await createClient();
  return supabase.auth.getUser();
});
