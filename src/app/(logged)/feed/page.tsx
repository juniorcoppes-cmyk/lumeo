import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getUser } from "@/lib/supabase/get-user";
import { ExperienceBadge } from "@/components/ExperienceBadge";
import { FeedComposer } from "@/components/FeedComposer";
import { formatarDataHora } from "@/lib/datas";
import { Stories, type Story } from "@/components/Stories";
import { publicarNoFeed, apagarDoFeed } from "./actions";
import { publicarStory, apagarStory } from "./stories-actions";

export const metadata = { title: "Feed — Secret" };

type Linha = {
  id: string;
  user_id: string;
  author_name: string;
  author_experience_level: string | null;
  author_avatar_path: string | null;
  type: "text" | "photo" | "photo_corpo" | "photo_rosto" | "event_confirmed";
  content: string | null;
  created_at: string;
  photo_storage_path: string | null;
  can_view_photo: boolean | null;
  photo_path: string | null;
  event_id: string | null;
  event_title: string | null;
};

export default async function FeedPage({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string }>;
}) {
  const { erro } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await getUser();
  if (!user) redirect("/login");

  const { data: perfil } = await supabase
    .from("users")
    .select("verification_badge_id, is_admin, is_support_channel")
    .eq("id", user.id)
    .single();

  const liberado =
    !!perfil?.verification_badge_id || !!perfil?.is_admin || !!perfil?.is_support_channel;

  if (!liberado) {
    return (
      <main className="mx-auto max-w-2xl px-6 py-16">
        <h1 className="text-2xl">Feed</h1>
        <p className="mt-3 text-muted">
          O feed abre assim que seu padrinho aceitar seu apadrinhamento. Enquanto isso,
          deixe o perfil pronto no{" "}
          <Link href="/inicio" className="text-accent">
            Início
          </Link>
          .
        </p>
      </main>
    );
  }

  const [{ data }, { data: storiesRaw }] = await Promise.all([
    supabase.rpc("get_timeline"),
    supabase.rpc("get_stories"),
  ]);
  // SÓ POSTAGEM (pedido do dono, 26/11/2026). O get_timeline também devolve
  // movimento automático — foto que alguém pôs no álbum do perfil e presença
  // confirmada em evento. Isso enchia o feed de cards que são retrato de
  // perfil, e o feed parecia uma lista de gente em vez do que a comunidade
  // escreveu. Aqui ficam só texto e foto publicados no próprio feed.
  const linhas = ((data ?? []) as Linha[]).filter(
    (l) => l.type === "text" || l.type === "photo",
  );

  // Os stories vêm com o caminho do arquivo; a URL assinada é de 5 min, como
  // no resto do app — endereço de imagem que vaze num print não serve depois.
  const stories: Story[] = await Promise.all(
    ((storiesRaw ?? []) as Story[]).map(async (s) => ({
      ...s,
      url: (
        await supabase.storage.from("profile-photos").createSignedUrl(s.photo_path, 300)
      ).data?.signedUrl,
      avatarUrl: (s as Story & { author_avatar_path?: string | null }).author_avatar_path
        ? (
            await supabase.storage
              .from("profile-photos")
              .createSignedUrl(
                (s as Story & { author_avatar_path: string }).author_avatar_path,
                300,
              )
          ).data?.signedUrl
        : undefined,
    })),
  );

  // Uma URL assinada por foto. São de 5 minutos: o bucket é privado, então
  // nenhum endereço de imagem daqui continua valendo se vazar de um print.
  const posts = await Promise.all(
    linhas.map(async (p) => {
      const assinar = async (caminho: string | null | undefined) =>
        caminho
          ? (await supabase.storage.from("profile-photos").createSignedUrl(caminho, 300)).data
              ?.signedUrl
          : undefined;
      return {
        ...p,
        avatarUrl: await assinar(p.author_avatar_path),
        fotoUrl:
          p.type === "photo"
            ? await assinar(p.photo_path)
            : p.can_view_photo
              ? await assinar(p.photo_storage_path)
              : undefined,
      };
    }),
  );

  return (
    <main className="mx-auto max-w-2xl px-6 py-10">
      <h1 className="text-2xl">Feed</h1>
      <p className="mt-1 text-sm text-muted">
        O que a comunidade anda vivendo. Rosto vai sempre borrado.
      </p>

      {erro && (
        <p className="mt-4 rounded-xl border border-red-800/50 bg-red-900/20 p-3 text-sm text-red-300">
          {erro}
        </p>
      )}

      <div className="mt-5">
        <Stories
          stories={stories}
          meuId={user.id}
          publicar={publicarStory}
          apagar={apagarStory}
        />
      </div>

      <div className="mt-6">
        <FeedComposer action={publicarNoFeed} />
      </div>

      {posts.length === 0 ? (
        <p className="mt-10 text-center text-sm text-muted">
          Ainda não tem nada por aqui. Que tal ser o primeiro?
        </p>
      ) : (
        <ul className="mt-8 flex flex-col gap-4">
          {posts.map((post) => (
            <li key={post.id} className="card">
              <div className="flex items-center justify-between gap-2 text-sm">
                <div className="flex min-w-0 items-center gap-2">
                  {post.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={post.avatarUrl} alt="" className="h-8 w-8 rounded-full object-cover" />
                  ) : (
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-accent-soft text-[9px] text-muted">
                      —
                    </div>
                  )}
                  <Link
                    href={`/perfil/${post.user_id}`}
                    className="truncate font-medium text-foreground no-underline hover:text-accent"
                  >
                    {post.author_name}
                  </Link>
                  <ExperienceBadge level={post.author_experience_level} />
                </div>
                <span className="shrink-0 text-xs text-muted">
                  {formatarDataHora(post.created_at)}
                </span>
              </div>

              {post.fotoUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={post.fotoUrl}
                  alt=""
                  className="mt-3 w-full rounded-xl object-cover"
                />
              )}

              {post.content && <p className="mt-3 text-sm">{post.content}</p>}

              {post.type === "event_confirmed" && (
                <p className="mt-3 text-sm text-foreground/90">
                  Confirmou presença em{" "}
                  <Link href={`/eventos/${post.event_id}`} className="text-accent">
                    {post.event_title}
                  </Link>
                  .
                </p>
              )}

              {post.user_id === user.id && post.type !== "event_confirmed" && (
                <form action={apagarDoFeed} className="mt-3">
                  <input type="hidden" name="post_id" value={post.id} />
                  <button type="submit" className="text-xs text-red-400 hover:underline">
                    Apagar
                  </button>
                </form>
              )}
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
