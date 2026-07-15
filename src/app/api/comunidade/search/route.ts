import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getUser } from "@/lib/supabase/get-user";

export async function GET(request: NextRequest) {
  const {
    data: { user },
  } = await getUser();
  if (!user) {
    return NextResponse.json({ results: [] }, { status: 401 });
  }

  const query = request.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (query.length < 2) {
    return NextResponse.json({ results: [] });
  }

  const supabase = await createClient();
  const { data: people } = await supabase.rpc("browse_verified_users", {
    p_max_distance_km: null,
    p_profile_filter: null,
    p_experience_level: null,
    p_name_query: query,
  });

  const results = await Promise.all(
    (people ?? []).slice(0, 8).map(async (p: { id: string; name: string; profile_type: string; avatar_path: string | null }) => {
      const avatarUrl = p.avatar_path
        ? (await supabase.storage.from("profile-photos").createSignedUrl(p.avatar_path, 300)).data
            ?.signedUrl
        : undefined;
      return { id: p.id, name: p.name, profile_type: p.profile_type, avatarUrl };
    }),
  );

  return NextResponse.json({ results });
}
