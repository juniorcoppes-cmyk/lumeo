import { NextResponse, type NextRequest } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";

// A foto do chat some da tela quando vence (temporária passou das 24h, única
// já foi vista, ou a mensagem foi apagada) — mas sumir não é apagar: sem esta
// limpeza o ARQUIVO ficaria no storage para sempre.
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

  // Mensagens com arquivo de foto que já pode sair do storage.
  const { data: vencidas, error } = await supabase
    .from("messages")
    .select("id, photo_path, photo_mode, photo_expires_at, photo_viewed_at, deleted_at")
    .not("photo_path", "is", null);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const alvos = (vencidas ?? []).filter((m) => {
    if (m.deleted_at) return true;
    if (m.photo_mode === "temporaria" && m.photo_expires_at && m.photo_expires_at < corte) return true;
    if (m.photo_mode === "unica" && m.photo_viewed_at && m.photo_viewed_at < corte) return true;
    return false;
  });

  if (alvos.length === 0) return NextResponse.json({ apagados: 0 });

  // Arquivo primeiro, linha depois: se o remove falhasse com a ordem inversa,
  // o caminho já teria sumido e ninguém mais saberia qual apagar.
  const caminhos = alvos.map((m) => m.photo_path).filter((p): p is string => !!p);
  if (caminhos.length > 0) {
    await supabase.storage.from("profile-photos").remove(caminhos);
  }
  await supabase
    .from("messages")
    .update({ photo_path: null })
    .in(
      "id",
      alvos.map((m) => m.id),
    );

  return NextResponse.json({ apagados: alvos.length });
}
