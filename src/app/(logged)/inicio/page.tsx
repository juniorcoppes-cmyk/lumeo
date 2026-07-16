import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getUser } from "@/lib/supabase/get-user";
import { ExperienceBadge } from "@/components/ExperienceBadge";
import { PlatformInviteLink } from "@/components/PlatformInviteLink";
import { PendingAccessPoller } from "@/components/PendingAccessPoller";
import { CalendarIcon, CheckCircleIcon } from "@/components/icons";
import { createTextPost, deleteTextPost, generatePlatformInvite, respondInvite } from "./actions";

type TimelineRow = {
  id: string;
  user_id: string;
  author_name: string;
  author_experience_level: string | null;
  author_avatar_path: string | null;
  type: "text" | "photo_corpo" | "photo_rosto" | "event_confirmed";
  content: string | null;
  created_at: string;
  photo_id: string | null;
  photo_category: "rosto" | "corpo" | null;
  photo_storage_path: string | null;
  can_view_photo: boolean | null;
  event_id: string | null;
  event_title: string | null;
};

export default async function InicioPage({
  searchParams,
}: {
  searchParams: Promise<{ apadrinhado?: string }>;
}) {
  const { apadrinhado } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await getUser();
  if (!user) redirect("/login");

  // As 4 consultas abaixo são independentes — rodar em paralelo em vez de
  // sequencial reduz o tempo de resposta da página.
  const [{ data: eventsRaw }, { data: invites }, { data: viewerProfile }, { data: platformInvites }] =
    await Promise.all([
      supabase
        .from("events")
        .select("id, title, event_date, location, description, photo_landscape_path")
        .gte("event_date", new Date().toISOString())
        .order("event_date", { ascending: true })
        .limit(5),
      supabase
        .from("event_invites")
        .select("id, status, event_id, events(title, event_date)")
        .eq("invitee_id", user.id)
        .neq("status", "declined")
        .order("created_at", { ascending: false }),
      supabase
        .from("users")
        .select("verification_badge_id, is_admin, is_support_channel, membership_status, hidden, sponsor:referred_by(name)")
        .eq("id", user.id)
        .single(),
      supabase
        .from("platform_invites")
        .select("id, invite_code, used_at, users:used_by(name)")
        .eq("inviter_id", user.id)
        .order("created_at", { ascending: false }),
    ]);

  const events = await Promise.all(
    (eventsRaw ?? []).map(async (event) => {
      if (!event.photo_landscape_path) return { ...event, thumbUrl: undefined };
      const { data } = await supabase.storage
        .from("event-photos")
        .createSignedUrl(event.photo_landscape_path, 300);
      return { ...event, thumbUrl: data?.signedUrl };
    }),
  );

  const canSeeTimeline =
    !!viewerProfile?.verification_badge_id ||
    !!viewerProfile?.is_admin ||
    !!viewerProfile?.is_support_channel;

  const membershipStatus = viewerProfile?.membership_status;
  const sponsor = Array.isArray(viewerProfile?.sponsor)
    ? viewerProfile?.sponsor[0]
    : viewerProfile?.sponsor;
  const sponsorName = (sponsor as { name: string } | null | undefined)?.name;

  let timelineRows: (TimelineRow & { photoUrl?: string; avatarUrl?: string })[] = [];

  if (canSeeTimeline) {
    const { data: posts } = await supabase.rpc("get_timeline");
    const rows = (posts ?? []) as TimelineRow[];

    timelineRows = await Promise.all(
      rows.map(async (post) => {
        const avatarUrl = post.author_avatar_path
          ? (
              await supabase.storage
                .from("profile-photos")
                .createSignedUrl(post.author_avatar_path, 300)
            ).data?.signedUrl
          : undefined;

        if (post.photo_storage_path && post.can_view_photo) {
          const { data } = await supabase.storage
            .from("profile-photos")
            .createSignedUrl(post.photo_storage_path, 300);
          return { ...post, photoUrl: data?.signedUrl, avatarUrl };
        }
        return { ...post, photoUrl: undefined, avatarUrl };
      }),
    );
  }

  // Só o convite pendente mais recente vira link copiável (platformInvites já
  // vem ordenado por created_at desc), pra página não acumular links. Os já
  // usados viram histórico ("Usado por X").
  const pendingInvite = platformInvites?.find((invite) => !invite.used_at);
  const usedInvites = (platformInvites ?? []).filter((invite) => invite.used_at);

  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="text-2xl">Início</h1>

      {viewerProfile?.hidden && (
        <div className="mt-4 rounded-2xl border border-on-accent-soft/40 bg-on-accent-soft/10 p-4 text-sm text-foreground/90">
          <strong className="text-foreground">Seu perfil está oculto.</strong> Você não aparece pra
          ninguém. Pra voltar a aparecer, reative em{" "}
          <Link href="/perfil" className="text-accent">
            Perfil → Sua conta
          </Link>
          .
        </div>
      )}

      {apadrinhado && (
        <div className="mt-4 rounded-2xl border border-green-700/50 bg-green-900/25 p-4 text-sm text-green-200">
          Você aceitou <strong className="text-green-100">{apadrinhado}</strong>! Avise que já pode
          acessar o Lumeo — é só entrar em www.lumeo.app.br.
        </div>
      )}

      {!canSeeTimeline && membershipStatus === "pending_sponsor" && (
        <div className="mt-4 rounded-2xl border border-on-accent-soft/40 bg-on-accent-soft/10 p-4 text-sm text-foreground/90">
          <strong className="text-foreground">Seu cadastro foi enviado!</strong> Assim que{" "}
          {sponsorName ?? "seu padrinho"} aceitar seu apadrinhamento, a comunidade, o chat e o resto
          do Lumeo abrem pra você — automaticamente, sem precisar recarregar. Por enquanto, dá uma
          olhada no “Comece por aqui” e nos próximos eventos abaixo.
          <PendingAccessPoller />
        </div>
      )}

      {!canSeeTimeline && membershipStatus === "rejected_by_sponsor" && (
        <div className="mt-4 rounded-2xl border border-red-800/50 bg-red-900/20 p-4 text-sm text-red-300">
          {sponsorName ?? "Seu padrinho"} não aceitou apadrinhar seu perfil, então seu acesso não foi
          liberado. Fale com quem te convidou ou peça um novo link de convite a outra pessoa da
          comunidade.
        </div>
      )}

      {!canSeeTimeline && membershipStatus === "rejected_by_admin" && (
        <div className="mt-4 rounded-2xl border border-red-800/50 bg-red-900/20 p-4 text-sm text-red-300">
          Seu perfil não foi confirmado pela administração. Fale com o suporte se quiser entender o
          motivo.
        </div>
      )}

      <details className="card mt-4">
        <summary className="cursor-pointer text-sm font-medium text-accent no-underline">
          Comece por aqui
        </summary>
        <div className="mt-3 flex flex-col gap-3 text-sm text-foreground/90">
          <p className="font-medium text-foreground">
            Lumeo é sobre conexão, não pressa.
          </p>
          <p>
            Você já sentiu que, nas baladas liberais ou apps de
            relacionamento comuns, o contato social de verdade fica em
            segundo plano? Que toda aproximação já vem com a expectativa —
            ou o receio — de que o objetivo seja uma interação íntima
            imediata?
          </p>
          <p>
            Foi pensando nessa lacuna que o Lumeo existe: um espaço de
            curadoria social pro meio liberal, pensado pra conhecer gente,
            ter boas conversas e se divertir sem a pressão de que algo mais
            precise acontecer. Se a sintonia rolar, ótimo — mas o encontro
            já vale pela companhia.
          </p>
        </div>
      </details>

      {canSeeTimeline && (
        <section className="card mt-4">
          <h2 className="text-lg text-green-400">Convidar alguém pra Lumeo</h2>
          <p className="text-sm text-muted">
            O cadastro só acontece através de convite — ao gerar um link, você vira o padrinho
            de quem se cadastrar por ele, e vai precisar aceitar ou recusar apadrinhar antes de
            continuar usando o app. Cada link só funciona uma vez — gere um link novo pra cada
            próxima pessoa que for convidar.
          </p>
          <form action={generatePlatformInvite} className="mt-3">
            <button type="submit" className="btn-primary">
              Gerar link de convite
            </button>
          </form>

          {pendingInvite && <PlatformInviteLink code={pendingInvite.invite_code} />}

          {usedInvites.length > 0 && (
            <ul className="mt-4 flex flex-col gap-2 text-sm">
              {usedInvites.map((invite) => {
                const usedByUser = Array.isArray(invite.users) ? invite.users[0] : invite.users;
                return (
                  <li key={invite.id} className="flex flex-wrap items-center gap-2">
                    <CheckCircleIcon className="h-4 w-4 shrink-0 text-green-400" />
                    <span className="text-muted">
                      Usado por <span className="text-foreground">{usedByUser?.name}</span>
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      )}

      <section className="mt-8">
        <h2 className="text-lg">Próximos eventos</h2>
        <ul className="mt-3 flex flex-col gap-3">
          {events.map((event) => (
            <li key={event.id}>
              <Link
                href={`/eventos/${event.id}`}
                className="card block overflow-hidden !p-0 no-underline hover:bg-accent-soft"
              >
                {event.thumbUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={event.thumbUrl}
                    alt=""
                    className="aspect-[16/9] w-full object-cover"
                  />
                )}
                <div className="p-4">
                  <div className="flex items-center gap-2">
                    <CalendarIcon className="h-4 w-4 shrink-0 text-accent" />
                    <span className="font-medium text-foreground">{event.title}</span>
                  </div>
                  <span className="text-sm text-muted">
                    {new Date(event.event_date).toLocaleString("pt-BR")} · {event.location}
                  </span>
                  {event.description && (
                    <p className="mt-1 line-clamp-2 text-sm text-muted">{event.description}</p>
                  )}
                </div>
              </Link>
            </li>
          ))}
          {events.length === 0 && <p className="text-muted">Nenhum evento agendado.</p>}
        </ul>
      </section>

      {invites && invites.length > 0 && (
        <section className="mt-8">
          <h2 className="text-lg">Indicações recebidas</h2>
          <ul className="mt-3 flex flex-col gap-2">
            {invites.map((invite) => {
              const event = Array.isArray(invite.events) ? invite.events[0] : invite.events;
              const isAccepted = invite.status === "accepted";
              return (
                <li
                  key={invite.id}
                  className={`rounded-2xl border p-3 ${
                    isAccepted
                      ? "border-green-700/40 bg-green-900/20"
                      : "border-on-accent-soft/40 bg-on-accent-soft/10"
                  }`}
                >
                  <Link href={`/eventos/${invite.event_id}`} className="block no-underline hover:opacity-80">
                    <span className="font-medium text-foreground">{event?.title}</span>
                    <span className="text-sm text-muted">
                      {" "}
                      · {event && new Date(event.event_date).toLocaleString("pt-BR")}
                    </span>
                  </Link>
                  {!isAccepted && (
                    <div className="mt-2 flex gap-2">
                      <form action={respondInvite}>
                        <input type="hidden" name="invite_id" value={invite.id} />
                        <input type="hidden" name="status" value="accepted" />
                        <button type="submit" className="btn-primary">
                          Aceitar
                        </button>
                      </form>
                      <form action={respondInvite}>
                        <input type="hidden" name="invite_id" value={invite.id} />
                        <input type="hidden" name="status" value="declined" />
                        <button type="submit" className="btn-secondary">
                          Recusar
                        </button>
                      </form>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <section className="mt-10 border-t border-line pt-8">
        <h2 className="text-lg">Linha do tempo</h2>

        {!canSeeTimeline ? (
          <p className="mt-2 text-muted">
            A linha do tempo abre assim que seu padrinho aceitar seu apadrinhamento.
          </p>
        ) : (
          <>
            <form action={createTextPost} className="mt-4 flex flex-col gap-2">
              <textarea
                name="content"
                placeholder="Compartilhe algo"
                required
                rows={3}
                className="input text-sm"
              />
              <button type="submit" className="btn-primary self-end">
                Publicar
              </button>
            </form>

            <ul className="mt-6 flex flex-col gap-4">
              {timelineRows.map((post) => (
                <li key={post.id} className="card">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      {post.avatarUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={post.avatarUrl}
                          alt=""
                          className="h-8 w-8 rounded-full object-cover"
                        />
                      ) : (
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-accent-soft text-[9px] text-muted">
                          —
                        </div>
                      )}
                      <Link href={`/perfil/${post.user_id}`} className="font-medium no-underline text-foreground hover:text-accent">
                        {post.author_name}
                      </Link>
                      <ExperienceBadge level={post.author_experience_level} />
                    </div>
                    <span className="text-xs text-muted">
                      {new Date(post.created_at).toLocaleString("pt-BR")}
                    </span>
                  </div>

                  {post.type === "text" && (
                    <div className="mt-2 flex items-start justify-between gap-2">
                      <p className="text-sm">{post.content}</p>
                      {post.user_id === user.id && (
                        <form action={deleteTextPost}>
                          <input type="hidden" name="post_id" value={post.id} />
                          <button
                            type="submit"
                            className="shrink-0 text-xs text-red-400 no-underline hover:underline"
                          >
                            Remover
                          </button>
                        </form>
                      )}
                    </div>
                  )}

                  {post.type === "event_confirmed" && (
                    <p className="mt-2 text-sm text-foreground/90">
                      Confirmou presença em{" "}
                      <Link href={`/eventos/${post.event_id}`}>
                        {post.event_title}
                      </Link>
                      .
                    </p>
                  )}

                  {(post.type === "photo_corpo" || post.type === "photo_rosto") &&
                    (post.photoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={post.photoUrl}
                        alt=""
                        className="mt-2 h-32 w-32 rounded-xl object-cover"
                      />
                    ) : (
                      <div className="mt-2 flex items-center gap-2 rounded-xl border border-dashed border-line p-3 text-sm text-muted">
                        <span>
                          Postou uma foto no álbum de rosto — privada, visível só
                          mediante aprovação.
                        </span>
                        <Link
                          href={`/perfil/${post.user_id}`}
                          className="shrink-0"
                        >
                          Solicitar acesso
                        </Link>
                      </div>
                    ))}
                </li>
              ))}
              {timelineRows.length === 0 && (
                <p className="text-muted">Nenhuma novidade ainda.</p>
              )}
            </ul>
          </>
        )}
      </section>
    </main>
  );
}
