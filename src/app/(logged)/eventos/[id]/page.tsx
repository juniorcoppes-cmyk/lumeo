import { redirect } from "next/navigation";
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
    .select("id, title, event_date, location, capacity, price")
    .eq("id", id)
    .single();

  if (!event) {
    return (
      <main className="mx-auto max-w-3xl px-6 py-16">
        <h1 className="text-2xl font-semibold">Evento não encontrado</h1>
      </main>
    );
  }

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

  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="text-2xl font-semibold">{event.title}</h1>
      <p className="mt-2 text-neutral-600">
        {new Date(event.event_date).toLocaleString("pt-BR")} · {event.location} ·{" "}
        {Number(event.price) > 0 ? `R$ ${Number(event.price).toFixed(2)}` : "Gratuito"}
      </p>

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
