import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getUser } from "@/lib/supabase/get-user";
import { ExperienceBadge } from "@/components/ExperienceBadge";
import { INTERESTS, PACE, SETTINGS, labelFor } from "@/lib/affinity";

type Match = {
  id: string;
  name: string;
  profile_type: string;
  verification_badge_id: string | null;
  experience_level: string | null;
  avatar_path: string | null;
  score: number;
  shared_interests: string[];
  shared_settings: string[];
  same_pace: boolean;
};

export default async function CombinamPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await getUser();
  if (!user) redirect("/login");

  const [{ data: myAffinity }, { data: matchesRaw }] = await Promise.all([
    supabase
      .from("profile_affinity")
      .select("interests, pace, settings")
      .eq("user_id", user.id)
      .maybeSingle(),
    supabase.rpc("affinity_matches", { p_limit: 30 }),
  ]);

  const myAffinityEmpty =
    !myAffinity ||
    ((myAffinity.interests ?? []).length === 0 &&
      (myAffinity.settings ?? []).length === 0 &&
      !myAffinity.pace);

  const matches = (matchesRaw ?? []) as Match[];

  const withAvatars = await Promise.all(
    matches.map(async (m) => {
      if (!m.avatar_path) return { ...m, avatarUrl: undefined as string | undefined };
      const { data } = await supabase.storage
        .from("profile-photos")
        .createSignedUrl(m.avatar_path, 300);
      return { ...m, avatarUrl: data?.signedUrl };
    }),
  );

  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <Link href="/comunidade" className="text-sm text-muted no-underline hover:text-accent">
        ← Comunidade
      </Link>
      <h1 className="mt-1 text-2xl">Quem combina com vocês</h1>
      <p className="mt-2 text-sm text-muted">
        Ordenado por sintonia — interesses, ambiente, ritmo e experiência em
        comum. Não é por foto.
      </p>

      {myAffinityEmpty ? (
        <div className="mt-8 rounded-[0.875rem] border border-line p-5">
          <p className="text-sm text-foreground">
            Pra gente mostrar quem combina com vocês, preencha primeiro a sua
            afinidade — leva um minuto.
          </p>
          <Link href="/perfil/afinidade" className="btn-primary mt-4 inline-block">
            Preencher afinidade
          </Link>
        </div>
      ) : withAvatars.length === 0 ? (
        <p className="mt-8 text-sm text-muted">
          Ainda não achamos ninguém com afinidade em comum. Conforme mais gente
          preencher a afinidade, esta lista vai crescer. Que tal{" "}
          <Link href="/perfil/afinidade">ajustar seus interesses</Link>?
        </p>
      ) : (
        <ul className="mt-8 flex flex-col gap-3">
          {withAvatars.map((m) => (
            <li key={m.id} className="rounded-[0.875rem] border border-line p-4">
              <div className="flex items-center gap-3">
                {m.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={m.avatarUrl} alt="" className="h-12 w-12 rounded-full object-cover" />
                ) : (
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-accent-soft text-xs text-muted">
                    —
                  </div>
                )}
                <div className="flex flex-col">
                  <Link
                    href={`/perfil/${m.id}`}
                    className="text-base font-medium text-foreground no-underline hover:text-accent"
                  >
                    {m.name}
                  </Link>
                  <span className="flex items-center gap-2 text-xs text-muted">
                    {m.profile_type === "casal" ? "Casal" : "Individual"}
                    <ExperienceBadge level={m.experience_level} />
                  </span>
                </div>
              </div>

              {(m.shared_interests.length > 0 || m.shared_settings.length > 0 || m.same_pace) && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {m.shared_interests.map((k) => (
                    <span key={`i-${k}`} className="tag">
                      {labelFor(INTERESTS, k)}
                    </span>
                  ))}
                  {m.shared_settings.map((k) => (
                    <span key={`s-${k}`} className="tag">
                      {labelFor(SETTINGS, k)}
                    </span>
                  ))}
                  {m.same_pace && myAffinity?.pace && (
                    <span className="tag">Mesmo ritmo: {labelFor(PACE, myAffinity.pace)}</span>
                  )}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
