import { NextResponse, type NextRequest } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";

// Keep-alive: o Supabase no plano gratuito PAUSA o projeto depois de ~7 dias
// sem nenhuma atividade no banco, e um projeto pausado derruba o app inteiro
// (o front carrega, mas qualquer chamada ao banco falha). Isso já aconteceu
// duas vezes (2026-09 e 2026-11). Este cron roda uma vez por dia e faz uma
// consulta trivial só pra registrar atividade — reseta o contador de
// inatividade e o projeto nunca mais dorme. Consulta mais leve possível:
// um único id da tabela `plans` (pequena e estável).
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const supabase = createServiceClient();
  const { error } = await supabase.from("plans").select("id").limit(1);

  if (error) {
    // Se o banco estiver pausado/fora, o insucesso aparece no log do cron na
    // Vercel — serve de alarme de que o keep-alive não está segurando.
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, pinged_at: new Date().toISOString() });
}
