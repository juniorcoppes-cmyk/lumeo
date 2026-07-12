import { NextResponse, type NextRequest } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";

// LGPD/minimização: verificações reprovadas cujo usuário nunca reenviou
// ficam com documento/vídeo retidos indefinidamente (diferente da aprovação,
// que já descarta na hora — ver src/app/admin/verificacoes/actions.ts).
// Este cron fecha essa lacuna depois de um prazo de retenção.
const REJECTION_RETENTION_DAYS = 30;

type VerificationRow = {
  id: string;
  user_id: string;
  document_url: string | null;
  video_url: string | null;
  created_at: string;
};

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const supabase = createServiceClient();
  const cutoff = new Date(
    Date.now() - REJECTION_RETENTION_DAYS * 24 * 60 * 60 * 1000,
  ).toISOString();

  const { data: candidates, error: candidatesError } = await supabase
    .from("verifications")
    .select("id, user_id, document_url, video_url, created_at")
    .eq("status", "rejected")
    .not("document_url", "is", null)
    .lt("reviewed_at", cutoff);

  if (candidatesError) {
    return NextResponse.json({ error: candidatesError.message }, { status: 500 });
  }

  if (!candidates || candidates.length === 0) {
    return NextResponse.json({ purgedWithStorage: 0, metadataOnly: 0 });
  }

  const userIds = [...new Set(candidates.map((c) => c.user_id))];
  const { data: allForUsers, error: allForUsersError } = await supabase
    .from("verifications")
    .select("id, user_id, created_at")
    .in("user_id", userIds);

  if (allForUsersError) {
    return NextResponse.json({ error: allForUsersError.message }, { status: 500 });
  }

  const latestByUser = new Map<string, { id: string; created_at: string }>();
  for (const row of allForUsers as Pick<VerificationRow, "id" | "user_id" | "created_at">[]) {
    const current = latestByUser.get(row.user_id);
    if (!current || row.created_at > current.created_at) {
      latestByUser.set(row.user_id, { id: row.id, created_at: row.created_at });
    }
  }

  let purgedWithStorage = 0;
  let metadataOnly = 0;

  for (const candidate of candidates as VerificationRow[]) {
    const isLatestForUser = latestByUser.get(candidate.user_id)?.id === candidate.id;

    if (isLatestForUser) {
      const paths = [candidate.document_url, candidate.video_url].filter(
        (path): path is string => !!path,
      );
      if (paths.length > 0) {
        await supabase.storage.from("verifications").remove(paths);
      }
      purgedWithStorage++;
    } else {
      // Reenviado depois: os paths (fixos por usuário) já foram sobrescritos
      // pela submissão mais nova — só limpamos o ponteiro desta linha antiga.
      metadataOnly++;
    }

    await supabase
      .from("verifications")
      .update({ document_url: null, video_url: null, purged_at: new Date().toISOString() })
      .eq("id", candidate.id);
  }

  return NextResponse.json({ purgedWithStorage, metadataOnly });
}
