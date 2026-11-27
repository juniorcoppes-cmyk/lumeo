import { NextResponse, type NextRequest } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";

// A foto do chat some da tela quando vence (temporária passou das 24h, única
// já foi vista, ou a mensagem foi apagada) — mas sumir não é apagar: sem esta
// limpeza o ARQUIVO ficaria no storage para sempre. Vale pro chat 1-a-1
// (messages) e pro chat de grupo do evento (event_messages); o grupo não tem
// 'unica'.
//
// A margem de 1 hora depois de vencida é de propósito: a URL assinada que o
// destinatário acabou de abrir vale uns minutos; apagar no limite exato
// arriscaria quebrar uma foto no meio de quem está vendo.
export async function GET(request: NextRequest) {
  if (request.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const supabase = createServiceClient();
  const corte = new Date(Date.now() - 60 * 60 * 1000).toISOString();

  // --- Chat 1-a-1 (messages): fixa/temporaria/unica -------------------------
  const { data: doChat, error: erroChat } = await supabase
    .from("messages")
    .select("id, photo_path, photo_mode, photo_expires_at, photo_viewed_at, deleted_at")
    .not("photo_path", "is", null);

  if (erroChat) return NextResponse.json({ error: erroChat.message }, { status: 500 });

  const alvosChat = (doChat ?? []).filter((m) => {
    if (m.deleted_at) return true;
    if (m.photo_mode === "temporaria" && m.photo_expires_at && m.photo_expires_at < corte) return true;
    if (m.photo_mode === "unica" && m.photo_viewed_at && m.photo_viewed_at < corte) return true;
    return false;
  });

  // --- Chat de grupo (event_messages): fixa/temporaria ----------------------
  const { data: doGrupo, error: erroGrupo } = await supabase
    .from("event_messages")
    .select("id, photo_path, photo_mode, photo_expires_at, deleted_at")
    .not("photo_path", "is", null);

  if (erroGrupo) return NextResponse.json({ error: erroGrupo.message }, { status: 500 });

  const alvosGrupo = (doGrupo ?? []).filter((m) => {
    if (m.deleted_at) return true;
    if (m.photo_mode === "temporaria" && m.photo_expires_at && m.photo_expires_at < corte) return true;
    return false;
  });

  // Arquivo primeiro, linha depois: se o remove falhasse com a ordem inversa,
  // o caminho já teria sumido e ninguém mais saberia qual apagar.
  const caminhos = [...alvosChat, ...alvosGrupo]
    .map((m) => m.photo_path)
    .filter((p): p is string => !!p);
  if (caminhos.length > 0) {
    await supabase.storage.from("profile-photos").remove(caminhos);
  }

  if (alvosChat.length > 0) {
    await supabase
      .from("messages")
      .update({ photo_path: null })
      .in("id", alvosChat.map((m) => m.id));
  }
  if (alvosGrupo.length > 0) {
    await supabase
      .from("event_messages")
      .update({ photo_path: null })
      .in("id", alvosGrupo.map((m) => m.id));
  }

  return NextResponse.json({ apagados: alvosChat.length + alvosGrupo.length });
}
