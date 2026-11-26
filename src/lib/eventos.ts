import { createClient } from "@/lib/supabase/server";
import { eventoJaPassou } from "@/lib/datas";
import type { EventoNoCartao } from "@/components/CardEvento";

/// O que o RPC events_with_open_slots devolve.
export type LinhaDeEvento = EventoNoCartao & {
  description: string | null;
  photo_landscape_path: string | null;
};

/**
 * Lê os eventos uma vez e separa em próximos e passados. Quem decide o que
 * já passou é `eventoJaPassou` (a noite acaba às 6 da manhã), não o SQL: a
 * mesma régua vale para as duas listas e fica num lugar só.
 *
 * Os próximos vêm do mais perto para o mais longe; os passados, do mais
 * recente para trás — é essa a ordem em que se procura cada um.
 */
export async function eventosSeparados(): Promise<{
  proximos: LinhaDeEvento[];
  passados: LinhaDeEvento[];
  erro?: string;
}> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("events_with_open_slots");
  const linhas = (data ?? []) as LinhaDeEvento[];

  const comFoto = await Promise.all(
    linhas.map(async (e) => {
      if (!e.photo_landscape_path) return e;
      const { data: url } = await supabase.storage
        .from("event-photos")
        .createSignedUrl(e.photo_landscape_path, 300);
      return { ...e, thumbUrl: url?.signedUrl };
    }),
  );

  const agora = new Date();
  const proximos = comFoto.filter((e) => !eventoJaPassou(e.event_date, agora));
  const passados = comFoto
    .filter((e) => eventoJaPassou(e.event_date, agora))
    .reverse();

  return { proximos, passados, erro: error?.message };
}
