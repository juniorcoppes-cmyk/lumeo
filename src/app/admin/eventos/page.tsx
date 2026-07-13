import { createClient } from "@/lib/supabase/server";
import { effectiveSubscriptionStatus } from "@/lib/subscription";
import {
  createEvent,
  deleteEvent,
  updateEvent,
  updateEventPhotos,
  updateRegistrationStatus,
} from "./actions";

function isPlusActive(
  subscription: { plan: string; status: string; overdue_since: string | null } | null | undefined,
) {
  if (!subscription || subscription.plan !== "plus") return false;
  const status = effectiveSubscriptionStatus(subscription.status, subscription.overdue_since);
  return status === "active" || status === "overdue";
}

function toDatetimeLocal(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default async function AdminEventosPage() {
  const supabase = await createClient();

  const { data: events } = await supabase
    .from("events")
    .select(
      "id, title, event_date, location, capacity, price, plus_price, description, photo_story_path, photo_landscape_path, event_registrations(id, status, users(name, email, subscriptions(plan, status, overdue_since)))",
    )
    .order("event_date", { ascending: true });

  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="text-2xl font-semibold">Eventos (admin)</h1>

      <form action={createEvent} className="mt-6 flex flex-col gap-3 rounded-lg border p-4">
        <h2 className="font-medium">Criar evento</h2>
        <input type="text" name="title" placeholder="Título" required className="rounded border px-3 py-2" />
        <input type="datetime-local" name="event_date" required className="rounded border px-3 py-2" />
        <input type="text" name="location" placeholder="Local" required className="rounded border px-3 py-2" />
        <input
          type="number"
          name="capacity"
          placeholder="Capacidade"
          min={1}
          required
          className="rounded border px-3 py-2"
        />
        <input
          type="number"
          name="price"
          placeholder="Preço (R$)"
          min={0}
          step="0.01"
          required
          className="rounded border px-3 py-2"
        />
        <label className="flex flex-col gap-1 text-sm text-neutral-600">
          Preço especial pra assinantes Plus (opcional)
          <input
            type="number"
            name="plus_price"
            placeholder="Deixe em branco pra não ter desconto nesse evento"
            min={0}
            step="0.01"
            className="rounded border px-3 py-2"
          />
        </label>
        <textarea
          name="description"
          placeholder="Descrição do evento"
          rows={3}
          className="rounded border px-3 py-2"
        />
        <label className="flex flex-col gap-1 text-sm text-neutral-600">
          Foto formato story (celular, vertical)
          <input type="file" name="story_photo" accept="image/*" className="text-sm" />
        </label>
        <label className="flex flex-col gap-1 text-sm text-neutral-600">
          Foto formato paisagem (computador, horizontal)
          <input type="file" name="landscape_photo" accept="image/*" className="text-sm" />
        </label>
        <button type="submit" className="self-start rounded bg-black px-4 py-2 text-white">
          Criar
        </button>
      </form>

      <ul className="mt-8 flex flex-col gap-6">
        {events?.map((event) => (
          <li key={event.id} className="rounded-lg border p-4">
            <div className="flex items-start justify-between gap-2">
              <h3 className="text-lg font-medium">{event.title}</h3>
              <form action={deleteEvent}>
                <input type="hidden" name="event_id" value={event.id} />
                <button type="submit" className="text-xs text-red-600 underline">
                  Excluir evento
                </button>
              </form>
            </div>

            <details className="mt-2">
              <summary className="cursor-pointer text-sm underline">Editar evento</summary>
              <form action={updateEvent} className="mt-3 flex flex-col gap-3 text-sm">
                <input type="hidden" name="event_id" value={event.id} />
                <input
                  type="text"
                  name="title"
                  defaultValue={event.title}
                  required
                  className="rounded border px-3 py-2"
                />
                <input
                  type="datetime-local"
                  name="event_date"
                  defaultValue={toDatetimeLocal(event.event_date)}
                  required
                  className="rounded border px-3 py-2"
                />
                <input
                  type="text"
                  name="location"
                  defaultValue={event.location}
                  required
                  className="rounded border px-3 py-2"
                />
                <input
                  type="number"
                  name="capacity"
                  defaultValue={event.capacity}
                  min={1}
                  required
                  className="rounded border px-3 py-2"
                />
                <input
                  type="number"
                  name="price"
                  defaultValue={Number(event.price)}
                  min={0}
                  step="0.01"
                  required
                  className="rounded border px-3 py-2"
                />
                <label className="flex flex-col gap-1 text-neutral-600">
                  Preço especial pra assinantes Plus (opcional)
                  <input
                    type="number"
                    name="plus_price"
                    defaultValue={event.plus_price !== null ? Number(event.plus_price) : ""}
                    placeholder="Deixe em branco pra não ter desconto nesse evento"
                    min={0}
                    step="0.01"
                    className="rounded border px-3 py-2"
                  />
                </label>
                <textarea
                  name="description"
                  defaultValue={event.description ?? ""}
                  rows={3}
                  className="rounded border px-3 py-2"
                />
                <button type="submit" className="self-start rounded border px-3 py-1.5">
                  Salvar alterações
                </button>
              </form>
            </details>

            <p className="mt-2 text-sm text-neutral-600">
              {new Date(event.event_date).toLocaleString("pt-BR")} · {event.location} ·
              {" "}capacidade {event.capacity} · R$ {Number(event.price).toFixed(2)}
              {event.plus_price !== null && (
                <> · Plus: R$ {Number(event.plus_price).toFixed(2)}</>
              )}
            </p>
            {event.description && (
              <p className="mt-1 text-sm text-neutral-600">{event.description}</p>
            )}

            <form action={updateEventPhotos} className="mt-3 flex flex-wrap items-end gap-3 text-sm">
              <input type="hidden" name="event_id" value={event.id} />
              <label className="flex flex-col gap-1 text-neutral-600">
                {event.photo_story_path ? "Trocar foto story" : "Foto story"}
                <input type="file" name="story_photo" accept="image/*" className="text-sm" />
              </label>
              <label className="flex flex-col gap-1 text-neutral-600">
                {event.photo_landscape_path ? "Trocar foto paisagem" : "Foto paisagem"}
                <input type="file" name="landscape_photo" accept="image/*" className="text-sm" />
              </label>
              <button type="submit" className="rounded border px-3 py-1.5">
                Salvar fotos
              </button>
            </form>

            <ul className="mt-3 flex flex-col gap-2">
              {[...(event.event_registrations ?? [])]
                .sort((a, b) => {
                  const userA = Array.isArray(a.users) ? a.users[0] : a.users;
                  const userB = Array.isArray(b.users) ? b.users[0] : b.users;
                  const subA = Array.isArray(userA?.subscriptions)
                    ? userA.subscriptions[0]
                    : userA?.subscriptions;
                  const subB = Array.isArray(userB?.subscriptions)
                    ? userB.subscriptions[0]
                    : userB?.subscriptions;
                  // Pendentes primeiro (é quem precisa de decisão do admin);
                  // dentro dos pendentes, Plus fura fila.
                  if (a.status === "pending" && b.status !== "pending") return -1;
                  if (b.status === "pending" && a.status !== "pending") return 1;
                  return Number(isPlusActive(subB)) - Number(isPlusActive(subA));
                })
                .map((reg) => {
                const user = Array.isArray(reg.users) ? reg.users[0] : reg.users;
                const subscription = Array.isArray(user?.subscriptions)
                  ? user.subscriptions[0]
                  : user?.subscriptions;
                const plus = isPlusActive(subscription);
                return (
                  <li key={reg.id} className="flex items-center justify-between text-sm">
                    <span>
                      {user?.name} ({user?.email}) — {reg.status}
                      {plus && (
                        <span className="ml-2 rounded-full border px-2 py-0.5 text-xs">
                          Plus — prioridade
                        </span>
                      )}
                    </span>
                    <div className="flex gap-2">
                      <form action={updateRegistrationStatus}>
                        <input type="hidden" name="registration_id" value={reg.id} />
                        <input type="hidden" name="status" value="confirmed" />
                        <button type="submit" className="rounded border px-2 py-1">
                          Confirmar
                        </button>
                      </form>
                      <form action={updateRegistrationStatus}>
                        <input type="hidden" name="registration_id" value={reg.id} />
                        <input type="hidden" name="status" value="cancelled" />
                        <button type="submit" className="rounded border px-2 py-1">
                          Cancelar
                        </button>
                      </form>
                    </div>
                  </li>
                );
              })}
              {event.event_registrations?.length === 0 && (
                <li className="text-sm text-neutral-500">Nenhum inscrito ainda.</li>
              )}
            </ul>
          </li>
        ))}
      </ul>
    </main>
  );
}
