import { NextResponse, type NextRequest } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";

// Story vive 24 horas. Quem esconde o vencido é o get_stories, na leitura —
// mas esconder não é apagar: sem esta limpeza o ARQUIVO ficaria no storage
// para sempre, invisível e ocupando espaço do plano gratuito.
//
// A margem de 1 dia a mais é de propósito: o cron roda uma vez por dia, e
// apagar no limite exato deixaria um story de 23h59 sumir no meio de quem
// está vendo.
const RETENCAO_HORAS = 48;

export async function GET(request: NextRequest) {
  if (request.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const supabase = createServiceClient();
  const corte = new Date(Date.now() - RETENCAO_HORAS * 60 * 60 * 1000).toISOString();

  const { data: vencidos, error } = await supabase
    .from("stories")
    .select("id, photo_path")
    .lt("created_at", corte);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!vencidos || vencidos.length === 0) return NextResponse.json({ apagados: 0 });

  // Arquivo primeiro, linha depois: se a ordem fosse inversa e o remove
  // falhasse, o caminho do arquivo já teria sumido e ninguém mais saberia
  // qual apagar.
  const caminhos = vencidos.map((s) => s.photo_path).filter(Boolean);
  if (caminhos.length > 0) {
    await supabase.storage.from("profile-photos").remove(caminhos);
  }
  await supabase
    .from("stories")
    .delete()
    .in("id", vencidos.map((s) => s.id));

  return NextResponse.json({ apagados: vencidos.length });
}
