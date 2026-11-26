import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getUser } from "@/lib/supabase/get-user";
import { PlatformInviteLink } from "@/components/PlatformInviteLink";
import { AutoRefresh } from "@/components/AutoRefresh";
import { SobreOLumeo } from "@/components/SobreOLumeo";
import { AccessExpiryWarning } from "@/components/AccessExpiryWarning";
import { PrimeirosPassos } from "@/components/PrimeirosPassos";
import { faltam, primeirosPassos } from "@/lib/primeiros-passos";
import { computeAccessExpiry } from "@/lib/access-expiry";
import { formatarDataHora } from "@/lib/datas";
import { EventMeta } from "@/components/EventMeta";
import { generatePlatformInvite, respondInvite } from "./actions";


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

  // As 5 consultas abaixo são independentes — rodar em paralelo em vez de
  // sequencial reduz o tempo de resposta da página.
  const [
    { data: eventsRaw },
    { data: invites },
    { data: viewerProfile },
    { data: platformInvites },
    { data: subscription },
    { data: afinidade },
    { count: fotosNoAlbum },
  ] = await Promise.all([
      supabase
        .from("events")
        .select("id, title, event_date, location, address, photo_landscape_path")
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
        .select(
          "verification_badge_id, is_admin, is_support_channel, membership_status, hidden, member_since, subscription_exempt, subscription_exempt_until, avatar_path, bio, sponsor:referred_by(name)",
        )
        .eq("id", user.id)
        .single(),
      supabase
        .from("platform_invites")
        .select("id, invite_code, used_at")
        .eq("inviter_id", user.id)
        .order("created_at", { ascending: false }),
      supabase
        .from("subscriptions")
        .select("status, renewed_at, overdue_since")
        .eq("user_id", user.id)
        .maybeSingle(),
      // As três abaixo alimentam a trilha de primeiros passos. São contagens
      // (head: true) de propósito: a trilha só precisa saber SE existe, e
      // trazer as linhas seria peso sem uso numa página que já faz 5
      // consultas.
      supabase
        .from("profile_affinity")
        .select("interests")
        .eq("user_id", user.id)
        .maybeSingle(),
      supabase
        .from("profile_photos")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id),
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

  // TRILHA DE PRIMEIROS PASSOS. Quem foi recusado não vê: a tela dele já diz
  // que o acesso não saiu, e oferecer tarefas ali seria crueldade.
  const passos = primeirosPassos({
    temFoto: !!viewerProfile?.avatar_path || (fotosNoAlbum ?? 0) > 0,
    temBio: !!(viewerProfile?.bio as string | null)?.trim(),
    temAfinidade: ((afinidade?.interests as string[] | null) ?? []).length > 0,
    aguardandoAcesso: !canSeeTimeline,
  });
  const mostrarTrilha =
    faltam(passos) > 0 &&
    membershipStatus !== "rejected_by_sponsor" &&
    membershipStatus !== "rejected_by_admin";
  const sponsor = Array.isArray(viewerProfile?.sponsor)
    ? viewerProfile?.sponsor[0]
    : viewerProfile?.sponsor;
  const sponsorName = (sponsor as { name: string } | null | undefined)?.name;

  // Aviso de vencimento, só quando faltam 0 a 3 dias. Cobre isenção com prazo
  // (testers), fim do teste grátis e mensalidade — quem decide qual é o caso é
  // o próprio computeAccessExpiry.
  const accessExpiry = computeAccessExpiry({
    isAdminOrSupport: !!viewerProfile?.is_admin || !!viewerProfile?.is_support_channel,
    subscriptionExempt: !!viewerProfile?.subscription_exempt,
    subscriptionExemptUntil: viewerProfile?.subscription_exempt_until as string | null | undefined,
    memberSince: viewerProfile?.member_since as string | null | undefined,
    subscription: subscription as
      | { status: string; renewed_at: string | null; overdue_since: string | null }
      | null
      | undefined,
  });

  // Só o convite pendente mais recente vira link copiável (platformInvites já
  // vem ordenado por created_at desc). Convite já usado não aparece de forma
  // nenhuma — o histórico "Usado por X" só acumulava lixo no card.
  const pendingInvite = platformInvites?.find((invite) => !invite.used_at);

  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="text-2xl">Início</h1>

      {accessExpiry && (
        <AccessExpiryWarning kind={accessExpiry.kind} daysLeft={accessExpiry.daysLeft} />
      )}

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
          acessar o Secret — é só entrar em www.socialsecret.com.br.
        </div>
      )}

      {!canSeeTimeline && membershipStatus === "pending_sponsor" && (
        <div className="mt-4 rounded-2xl border border-on-accent-soft/40 bg-on-accent-soft/10 p-4 text-sm text-foreground/90">
          <strong className="text-foreground">Seu cadastro foi enviado!</strong> Assim que{" "}
          {sponsorName ?? "seu padrinho"} aceitar seu apadrinhamento, a comunidade, o chat e o resto
          do Secret abrem pra você — automaticamente, sem precisar recarregar. Por enquanto, dá uma
          olhada no “Comece por aqui” e nos próximos eventos abaixo.
          <AutoRefresh />
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

      {mostrarTrilha && (
        <PrimeirosPassos passos={passos} aguardandoAcesso={!canSeeTimeline} />
      )}

      <details className="card mt-4">
        <summary className="cursor-pointer text-sm font-medium text-accent no-underline">
          Comece por aqui
        </summary>
        <SobreOLumeo className="mt-3" />
      </details>

      {/* Guia do meio liberal — página estática servida de public/guia.html
          (não é rota do app, por isso <a> e não <Link>). Abre em outra aba
          pra não derrubar a sessão do app; a própria página tem CTAs de volta
          pro Secret. Visível a todos, inclusive quem ainda aguarda padrinho —
          é justamente o conteúdo que tira as dúvidas de quem está chegando. */}
      <a
        href="/guia"
        target="_blank"
        rel="noopener noreferrer"
        className="card mt-4 flex items-center justify-between gap-4 no-underline transition-colors hover:border-accent"
      >
        <div>
          <h2 className="text-lg text-foreground">Novo no meio liberal?</h2>
          <p className="mt-1 text-sm text-muted">
            Swing, casas, etiqueta e primeiros passos — nosso guia explica tudo, sem
            tabu e sem julgamento.
          </p>
        </div>
        <span className="btn-secondary shrink-0 whitespace-nowrap">Abrir o guia</span>
      </a>

      {canSeeTimeline && (
        <section className="card mt-4">
          <h2 className="text-lg text-green-400">Convidar alguém pra Secret</h2>
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
                  <span className="block font-medium text-foreground">{event.title}</span>
                  <EventMeta
                    eventDate={event.event_date}
                    location={event.location}
                    address={event.address}
                    className="mt-2"
                  />
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
                      · {event && formatarDataHora(event.event_date)}
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

      {/* A linha do tempo saiu daqui e virou a página /feed. O Início ficou
          sendo o painel — primeiros passos, eventos, convites — e o feed, o
          lugar de voltar todo dia. Misturados, o feed nascia escondido no
          rodapé e empurrava o resto pra baixo à medida que crescesse. */}
      <section className="mt-10 border-t border-line pt-8">
        <h2 className="text-lg">Feed</h2>
        {!canSeeTimeline ? (
          <p className="mt-2 text-muted">
            O feed abre assim que seu padrinho aceitar seu apadrinhamento.
          </p>
        ) : (
          <>
            <p className="mt-1 text-sm text-muted">
              O que a comunidade anda vivendo — fotos com rosto borrado e recados.
            </p>
            <Link href="/feed" className="btn-primary mt-3 inline-block no-underline">
              Abrir o feed
            </Link>
          </>
        )}
      </section>

    </main>
  );
}
