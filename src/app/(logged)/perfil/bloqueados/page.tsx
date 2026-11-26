import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getUser } from "@/lib/supabase/get-user";
import { desbloquearPerfil } from "../[id]/actions";

type Bloqueado = {
  id: string;
  name: string;
  avatar_path: string | null;
  created_at: string;
};

export default async function BloqueadosPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await getUser();
  if (!user) redirect("/login");

  const { data: blockedRaw } = await supabase.rpc("meus_bloqueados");
  const blocked = (blockedRaw ?? []) as Bloqueado[];

  const withAvatars = await Promise.all(
    blocked.map(async (b) => {
      if (!b.avatar_path) return { ...b, avatarUrl: undefined as string | undefined };
      const { data } = await supabase.storage
        .from("profile-photos")
        .createSignedUrl(b.avatar_path, 300);
      return { ...b, avatarUrl: data?.signedUrl };
    }),
  );

  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <Link href="/perfil" className="text-sm text-muted no-underline hover:text-accent">
        ← Perfil
      </Link>
      <h1 className="mt-1 text-2xl">Perfis bloqueados</h1>
      <p className="mt-2 text-sm text-muted">
        Quem você bloqueou some pra você na comunidade, no feed e nos matches, e
        vocês não trocam mensagens. Desbloquear volta tudo ao normal.
      </p>

      {withAvatars.length === 0 ? (
        <p className="mt-8 text-sm text-muted">Você não bloqueou ninguém.</p>
      ) : (
        <ul className="mt-6 flex flex-col gap-2">
          {withAvatars.map((b) => (
            <li key={b.id} className="card flex items-center gap-3">
              {b.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={b.avatarUrl}
                  alt=""
                  className="h-10 w-10 shrink-0 rounded-full object-cover"
                />
              ) : (
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent-soft text-[10px] text-muted">
                  —
                </div>
              )}
              <span className="min-w-0 flex-1 truncate font-medium text-foreground">
                {b.name}
              </span>
              <form action={desbloquearPerfil} className="shrink-0">
                <input type="hidden" name="blocked_id" value={b.id} />
                <button type="submit" className="btn-secondary !px-3 !py-1 !text-xs">
                  Desbloquear
                </button>
              </form>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
