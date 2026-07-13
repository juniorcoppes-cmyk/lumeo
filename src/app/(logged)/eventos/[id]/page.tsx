import Link from "next/link";
import { redirect } from "next/navigation";
import { ExperienceBadge } from "@/components/ExperienceBadge";
import { createClient } from "@/lib/supabase/server";
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
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: event } = await supabase
    .from("events")
    .select(
      "id, title, event_date, location, capacity, price, description, photo_story_path, photo_landscape_path",
    )
    .eq("id", id)
    .single();

  if (!event) {
    return (
      <main className="mx-auto max-w-3xl px-6 py-16">
        <h1 className="text-2xl font-semibold">Evento não encontrado</h1>
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

  const { data: profile } = await supabase
    .from("users")
    .select("verification_badge_id")
    .eq("id", user.id)
    .single();

  const { data: billing } = await supabase
    .from("billing_profiles")
    .select("cpf_cnpj")
    .eq("user_id", user.id)
    .maybeSingle();

  const { data: registration } = await supabase
    .from("event_registrations")
    .select("status, payment_status, payment_url")
    .eq("event_id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  const { data: myInvites } = await supabase
    .from("event_invites")
    .select("id, invite_code, status, invitee_id")
    .eq("event_id", id)
    .eq("inviter_id", user.id)
    .order("created_at", { ascending: false });

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
          className="block aspect-[9/16] w-full max-w-xs rounded-lg object-cover md:hidden"
        />
      )}
      {landscapeUrl.data?.signedUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={landscapeUrl.data.signedUrl}
          alt=""
          className="hidden aspect-[16/9] w-full rounded-lg object-cover md:block"
        />
      )}

      <h1 className="mt-4 text-2xl font-semibold">{event.title}</h1>
      <p className="mt-2 text-neutral-600">
        {new Date(event.event_date).toLocaleString("pt-BR")} · {event.location} ·{" "}
        {Number(event.price) > 0 ? `R$ ${Number(event.price).toFixed(2)}` : "Gratuito"}
      </p>
      {event.description && <p className="mt-2 text-neutral-700">{event.description}</p>}

      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

      {registration ? (
        <div className="mt-6 text-sm text-neutral-600">
          <p>
            Sua inscrição está: <strong>{registration.status}</strong>
            {registration.payment_status !== "not_required" && (
              <> · pagamento: <strong>{registration.payment_status}</strong></>
            )}
          </p>
          {registration.payment_url && registration.payment_status === "pending" && (
            <a href={registration.payment_url} target="_blank" rel="noreferrer" className="underline">
              Finalizar pagamento
            </a>
          )}
        </div>
      ) : profile?.verification_badge_id ? (
        <form action={inscrever} className="mt-6 flex flex-col gap-3">
          <input type="hidden" name="event_id" value={event.id} />
          {Number(event.price) > 0 && !billing?.cpf_cnpj && (
            <input
              type="text"
              name="cpf_cnpj"
              placeholder="CPF"
              required
              className="w-full max-w-xs rounded border px-3 py-2 text-sm"
            />
          )}
          <button type="submit" className="self-start rounded bg-black px-4 py-2 text-white">
            Confirmar vaga
          </button>
        </form>
      ) : (
        <p className="mt-6 text-sm text-neutral-600">
          Sua verificação de identidade ainda não foi aprovada — isso é
          necessário antes de se inscrever em um evento.
        </p>
      )}

      {attendees && attendees.length > 0 && (
        <div className="mt-10 border-t pt-6">
          <h2 className="text-lg font-medium">Quem já confirmou presença</h2>
          <ul className="mt-3 flex flex-col gap-2">
            {attendees.map(
              (attendee: {
                id: string;
                name: string;
                verification_badge_id: string | null;
                experience_level: string | null;
              }) => (
                <li key={attendee.id} className="flex items-center gap-2">
                  <Link href={`/perfil/${attendee.id}`} className="text-sm font-medium underline">
                    {attendee.name}
                  </Link>
                  <ExperienceBadge level={attendee.experience_level} />
                </li>
              ),
            )}
          </ul>
        </div>
      )}

      <div className="mt-10 border-t pt-6">
        <h2 className="text-lg font-medium">Indicar este evento</h2>

        <form action={convidarPorSelo} className="mt-3 flex items-center gap-2">
          <input type="hidden" name="event_id" value={event.id} />
          <input
            type="text"
            name="badge_id"
            placeholder="Selo de quem você quer indicar"
            required
            className="rounded border px-3 py-2 text-sm"
          />
          <button type="submit" className="rounded border px-3 py-2 text-sm">
            Indicar
          </button>
        </form>

        <form action={gerarLinkConvite} className="mt-3">
          <input type="hidden" name="event_id" value={event.id} />
          <button type="submit" className="rounded border px-3 py-2 text-sm">
            Gerar link de convite
          </button>
        </form>

        {myInvites && myInvites.length > 0 && (
          <ul className="mt-4 flex flex-col gap-1 text-sm text-neutral-600">
            {myInvites.map((invite) => (
              <li key={invite.id}>
                {invite.invitee_id ? "Indicado por selo" : "Link"}: /convite/{invite.invite_code} —{" "}
                {invite.status}
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
