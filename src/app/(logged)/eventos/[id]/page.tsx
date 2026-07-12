import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { inscrever } from "./actions";

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
    .select("id, title, event_date, location, capacity")
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

  const { data: registration } = await supabase
    .from("event_registrations")
    .select("status, payment_status")
    .eq("event_id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="text-2xl font-semibold">{event.title}</h1>
      <p className="mt-2 text-neutral-600">
        {new Date(event.event_date).toLocaleString("pt-BR")} · {event.location}
      </p>

      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

      {registration ? (
        <p className="mt-6 text-sm text-neutral-600">
          Sua inscrição está: <strong>{registration.status}</strong>
        </p>
      ) : profile?.verification_badge_id ? (
        <form action={inscrever} className="mt-6">
          <input type="hidden" name="event_id" value={event.id} />
          <button type="submit" className="rounded bg-black px-4 py-2 text-white">
            Confirmar vaga
          </button>
        </form>
      ) : (
        <p className="mt-6 text-sm text-neutral-600">
          Sua verificação de identidade ainda não foi aprovada — isso é
          necessário antes de se inscrever em um evento.
        </p>
      )}
    </main>
  );
}
