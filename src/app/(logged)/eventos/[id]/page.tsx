import Link from "next/link";
import { redirect } from "next/navigation";
import { ExperienceBadge } from "@/components/ExperienceBadge";
import { CopyLinkButton } from "@/components/CopyLinkButton";
import { createClient } from "@/lib/supabase/server";
import { getUser } from "@/lib/supabase/get-user";
import { effectiveSubscriptionStatus } from "@/lib/subscription";
import { convidarPorSelo, gerarLinkConvite, inscrever } from "./actions";

export default async function EventoDetalhePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const { error } = await searchParams;
  const supabase = await createClient();

  const {
    data: { user },
  } = await getUser();
  if (!user) redirect("/login");

  const { data: event } = await supabase
    .from("events")
    .select(
      "id, title, event_date, location, capacity, price, plus_price, description, photo_story_path, photo_landscape_path",
    )
    .eq("id", id)
    .single();

  if (!event) {
    return (
      <main className="mx-auto max-w-3xl px-6 py-16">
        <h1 className="text-2xl">Evento não encontrado</h1>
      </main>
    );
  }

  const [storyUrl, landscapeUrl] = await Promise.all([
    event.photo_story_path
      ? supabase.storage.from("event-photos").createSignedUrl(event.photo_story_path, 300)
      : Promise.resolve({ data: undefined }),
    event.photo_landscape_path
      ? supabase.storage.from("event-photos").createSignedUrl(event.photo_landscape_path, 300)
      : Promise.resolve({ data: undefined }),
  ]);

  // Nenhuma dessas 6 consultas depende do resultado de outra — rodar em
  // paralelo em vez de sequencial corta a maior parte do tempo de resposta
  // desta página (era o gargalo de performance percebido pelo fundador).
  const [
    { data: profile },
    { data: billing },
    { data: registration },
    { count: confirmedCount },
    { data: subscription },
    { data: myInvites },
  ] = await Promise.all([
    supabase
      .from("users")
      .select("verification_badge_id, is_admin, is_support_channel")
      .eq("id", user.id)
      .single(),
    supabase.from("billing_profiles").select("cpf_cnpj").eq("user_id", user.id).maybeSingle(),
    supabase
      .from("event_registrations")
      .select("status, payment_status, payment_url")
      .eq("event_id", id)
      .eq("user_id", user.id)
      .maybeSingle(),
    supabase
      .from("event_registrations")
      .select("id", { count: "exact", head: true })
      .eq("event_id", id)
      .eq("status", "confirmed"),
    supabase
      .from("subscriptions")
      .select("plan, status, overdue_since")
      .eq("user_id", user.id)
      .maybeSingle(),
    supabase
      .from("event_invites")
      .select("id, invite_code, status, invitee_id")
      .eq("event_id", id)
      .eq("inviter_id", user.id)
      .order("created_at", { ascending: false }),
  ]);

  const canRegister =
    !!profile?.verification_badge_id || !!profile?.is_admin || !!profile?.is_support_channel;

  const isFull = (confirmedCount ?? 0) >= event.capacity;

  const isPlusActive =
    subscription?.plan === "plus" &&
    ["active", "overdue"].includes(
      effectiveSubscriptionStatus(subscription.status, subscription.overdue_since),
    );

  // A RPC já restringe a lista a quem também está confirmado no mesmo
  // evento (ver confirmed_attendees_for_event) — não expõe presença pra
  // quem só está navegando/não confirmou.
  const { data: attendees } =
    registration?.status === "confirmed"
      ? await supabase.rpc("confirmed_attendees_for_event", { p_event_id: id })
      : { data: [] };

  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      {storyUrl.data?.signedUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={storyUrl.data.signedUrl}
          alt=""
          className="block aspect-[9/16] w-full max-w-xs rounded-2xl object-cover md:hidden"
        />
      )}
      {landscapeUrl.data?.signedUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={landscapeUrl.data.signedUrl}
          alt=""
          className="hidden aspect-[16/9] w-full rounded-2xl object-cover md:block"
        />
      )}

      <h1 className="mt-4 text-2xl">{event.title}</h1>
      <p className="mt-2 text-muted">
        {new Date(event.event_date).toLocaleString("pt-BR")} · {event.location} ·{" "}
        {Number(event.price) > 0 ? `R$ ${Number(event.price).toFixed(2)}` : "Gratuito"}
      </p>
      {event.plus_price !== null && (
        <p className={`text-sm ${isPlusActive ? "font-medium text-foreground" : "text-muted"}`}>
          Preço especial pra assinantes Plus: R$ {Number(event.plus_price).toFixed(2)}
          {!isPlusActive && (
            <>
              {" "}
              ·{" "}
              <Link href="/assinatura">
                Assine o Plus
              </Link>
            </>
          )}
        </p>
      )}
      {event.description && <p className="mt-2 text-foreground/90">{event.description}</p>}

      {error && <p className="mt-4 text-sm text-red-400">{error}</p>}

      {registration ? (
        <div className="mt-6 text-sm text-muted">
          <p>
            Sua inscrição está: <strong className="text-foreground">{registration.status}</strong>
            {registration.payment_status !== "not_required" && (
              <> · pagamento: <strong className="text-foreground">{registration.payment_status}</strong></>
            )}
          </p>
          {registration.payment_url && registration.payment_status === "pending" && (
            <a href={registration.payment_url} target="_blank" rel="noreferrer">
              Finalizar pagamento
            </a>
          )}
        </div>
      ) : canRegister ? (
        <form action={inscrever} className="mt-6 flex flex-col gap-3">
          {isFull && (
            <p className="text-sm text-on-accent-soft">
              Evento lotado —{" "}
              {isPlusActive
                ? "como assinante Plus, sua inscrição entra na lista de prioridade: se abrir uma vaga, você é chamado primeiro."
                : "sua inscrição entra na lista de espera. Assinantes Plus têm prioridade quando abre uma vaga."}
            </p>
          )}
          <input type="hidden" name="event_id" value={event.id} />
          {Number(event.price) > 0 && !billing?.cpf_cnpj && (
            <input
              type="text"
              name="cpf_cnpj"
              placeholder="CPF"
              required
              className="input w-full max-w-xs text-sm"
            />
          )}
          <button type="submit" className="btn-primary self-start">
            {isFull ? "Entrar na lista de espera" : "Confirmar vaga"}
          </button>
        </form>
      ) : (
        <p className="mt-6 text-sm text-muted">
          Sua verificação de identidade ainda não foi aprovada — isso é
          necessário antes de se inscrever em um evento.
        </p>
      )}

      {attendees && attendees.length > 0 && (
        <div className="mt-10 border-t border-line pt-6">
          <h2 className="text-lg">Quem já confirmou presença</h2>
          <ul className="mt-3 flex flex-col gap-2">
            {attendees.map(
              (attendee: {
                id: string;
                name: string;
                verification_badge_id: string | null;
                experience_level: string | null;
              }) => (
                <li key={attendee.id} className="flex items-center gap-2">
                  <Link href={`/perfil/${attendee.id}`} className="text-sm font-medium no-underline text-foreground hover:text-accent">
                    {attendee.name}
                  </Link>
                  <ExperienceBadge level={attendee.experience_level} />
                </li>
              ),
            )}
          </ul>
        </div>
      )}

      <div className="mt-10 border-t border-line pt-6">
        <h2 className="text-lg">Indicar este evento</h2>

        <form action={convidarPorSelo} className="mt-3 flex items-center gap-2">
          <input type="hidden" name="event_id" value={event.id} />
          <input
            type="text"
            name="badge_id"
            placeholder="Selo de quem você quer indicar"
            required
            className="input text-sm"
          />
          <button type="submit" className="btn-secondary">
            Indicar
          </button>
        </form>

        <form action={gerarLinkConvite} className="mt-3">
          <input type="hidden" name="event_id" value={event.id} />
          <button type="submit" className="btn-secondary">
            Gerar link de convite
          </button>
        </form>

        {myInvites && myInvites.length > 0 && (
          <ul className="mt-4 flex flex-col gap-2 text-sm text-muted">
            {myInvites.map((invite) => (
              <li key={invite.id} className="flex items-center gap-2">
                <span>
                  {invite.invitee_id ? "Indicado por selo" : "Link"}: /convite/{invite.invite_code} —{" "}
                  {invite.status}
                </span>
                {!invite.invitee_id && (
                  <CopyLinkButton path={`/convite/${invite.invite_code}`} />
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
