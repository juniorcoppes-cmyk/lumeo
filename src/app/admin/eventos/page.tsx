import { createClient } from "@/lib/supabase/server";
import { effectiveSubscriptionStatus } from "@/lib/subscription";
import { CompressingForm } from "@/components/CompressingForm";
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
      "id, title, event_date, location, address, capacity, price, plus_price, description, photo_story_path, photo_landscape_path, event_registrations(id, status, users(name, email, subscriptions(plan, status, overdue_since)))",
    )
    .order("event_date", { ascending: true });

  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="text-2xl">Eventos (admin)</h1>

      <CompressingForm
        action={createEvent}
        imageFields={["story_photo", "landscape_photo"]}
        className="mt-6 flex flex-col gap-3 card"
      >
        <h2 className="text-lg">Criar evento</h2>
        <input type="text" name="title" placeholder="Título" required className="input" />
        <input type="datetime-local" name="event_date" required className="input" />
        <input type="text" name="location" placeholder="Local (nome do lugar)" required className="input" />
        <input type="text" name="address" placeholder="Endereço (rua, número, bairro, cidade)" className="input" />
        <input
          type="number"
          name="capacity"
          placeholder="Capacidade"
          min={1}
          required
          className="input"
        />
        <input
          type="number"
          name="price"
          placeholder="Preço (R$)"
          min={0}
          step="0.01"
          required
          className="input"
        />
        <label className="flex flex-col gap-1 text-sm text-muted">
          Preço especial pra assinantes Plus (opcional)
          <input
            type="number"
            name="plus_price"
            placeholder="Deixe em branco pra não ter desconto nesse evento"
            min={0}
            step="0.01"
            className="input"
          />
        </label>
        <textarea
          name="description"
          placeholder="Descrição do evento"
          rows={3}
          className="input"
        />
        <label className="flex flex-col gap-1 text-sm text-muted">
          Foto formato story (celular, vertical)
          <input type="file" name="story_photo" accept="image/*" className="text-sm" />
        </label>
        <label className="flex flex-col gap-1 text-sm text-muted">
          Foto formato paisagem (computador, horizontal)
          <input type="file" name="landscape_photo" accept="image/*" className="text-sm" />
        </label>
        <button type="submit" className="btn-primary self-start">
          Criar
        </button>
      </CompressingForm>

      <ul className="mt-8 flex flex-col gap-6">
        {events?.map((event) => (
          <li key={event.id} className="card">
            <div className="flex items-start justify-between gap-2">
              <h3 className="text-lg">{event.title}</h3>
              <form action={deleteEvent}>
                <input type="hidden" name="event_id" value={event.id} />
                <button type="submit" className="text-xs text-red-400 no-underline hover:underline">
                  Excluir evento
                </button>
              </form>
            </div>

            <details className="mt-2">
              <summary className="cursor-pointer text-sm text-accent no-underline">Editar evento</summary>
              <form action={updateEvent} className="mt-3 flex flex-col gap-3 text-sm">
                <input type="hidden" name="event_id" value={event.id} />
                <input
                  type="text"
                  name="title"
                  defaultValue={event.title}
                  required
                  className="input"
                />
                <input
                  type="datetime-local"
                  name="event_date"
                  defaultValue={toDatetimeLocal(event.event_date)}
                  required
                  className="input"
                />
                <input
                  type="text"
                  name="location"
                  defaultValue={event.location}
                  placeholder="Local (nome do lugar)"
                  required
                  className="input"
                />
                <input
                  type="text"
                  name="address"
                  defaultValue={event.address ?? ""}
                  placeholder="Endereço (rua, número, bairro, cidade)"
                  className="input"
                />
                <input
                  type="number"
                  name="capacity"
                  defaultValue={event.capacity}
                  min={1}
                  required
                  className="input"
                />
                <input
                  type="number"
                  name="price"
                  defaultValue={Number(event.price)}
                  min={0}
                  step="0.01"
                  required
                  className="input"
                />
                <label className="flex flex-col gap-1 text-muted">
                  Preço especial pra assinantes Plus (opcional)
                  <input
                    type="number"
                    name="plus_price"
                    defaultValue={event.plus_price !== null ? Number(event.plus_price) : ""}
                    placeholder="Deixe em branco pra não ter desconto nesse evento"
                    min={0}
                    step="0.01"
                    className="input"
                  />
                </label>
                <textarea
                  name="description"
                  defaultValue={event.description ?? ""}
                  rows={3}
                  className="input"
                />
                <button type="submit" className="btn-secondary self-start">
                  Salvar alterações
                </button>
              </form>
            </details>

            <p className="mt-2 text-sm text-muted">
              {new Date(event.event_date).toLocaleString("pt-BR")} · {event.location} ·
              {" "}capacidade {event.capacity} · R$ {Number(event.price).toFixed(2)}
              {event.plus_price !== null && (
                <> · Plus: R$ {Number(event.plus_price).toFixed(2)}</>
              )}
            </p>
            {event.description && (
              <p className="mt-1 text-sm text-muted">{event.description}</p>
            )}

            <CompressingForm
              action={updateEventPhotos}
              imageFields={["story_photo", "landscape_photo"]}
              className="mt-3 flex flex-wrap items-end gap-3 text-sm"
            >
              <input type="hidden" name="event_id" value={event.id} />
              <label className="flex flex-col gap-1 text-muted">
                {event.photo_story_path ? "Trocar foto story" : "Foto story"}
                <input type="file" name="story_photo" accept="image/*" className="text-sm" />
              </label>
              <label className="flex flex-col gap-1 text-muted">
                {event.photo_landscape_path ? "Trocar foto paisagem" : "Foto paisagem"}
                <input type="file" name="landscape_photo" accept="image/*" className="text-sm" />
              </label>
              <button type="submit" className="btn-secondary">
                Salvar fotos
              </button>
            </CompressingForm>

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
                  <li
                    key={reg.id}
                    className={`flex flex-wrap items-center justify-between gap-2 rounded-xl border p-2 text-sm ${
                      reg.status === "confirmed"
                        ? "border-green-700/40 bg-green-900/20"
                        : reg.status === "cancelled"
                          ? "border-line opacity-60"
                          : "border-line"
                    }`}
                  >
                    <span>
                      {user?.name} ({user?.email}) — {reg.status}
                      {plus && (
                        <span className="ml-2 tag">
                          Plus — prioridade
                        </span>
                      )}
                    </span>
                    <div className="flex gap-2">
                      <form action={updateRegistrationStatus}>
                        <input type="hidden" name="registration_id" value={reg.id} />
                        <input type="hidden" name="status" value="confirmed" />
                        <button
                          type="submit"
                          className={
                            reg.status === "confirmed"
                              ? "btn-primary !bg-green-700 !px-2.5 !py-1 !text-xs"
                              : "btn-secondary !px-2.5 !py-1 !text-xs"
                          }
                        >
                          Confirmar
                        </button>
                      </form>
                      <form action={updateRegistrationStatus}>
                        <input type="hidden" name="registration_id" value={reg.id} />
                        <input type="hidden" name="status" value="cancelled" />
                        <button
                          type="submit"
                          className={
                            reg.status === "cancelled"
                              ? "btn-primary !bg-red-800 !px-2.5 !py-1 !text-xs"
                              : "btn-secondary !px-2.5 !py-1 !text-xs"
                          }
                        >
                          Cancelar
                        </button>
                      </form>
                    </div>
                  </li>
                );
              })}
              {event.event_registrations?.length === 0 && (
                <li className="text-sm text-muted">Nenhum inscrito ainda.</li>
              )}
            </ul>
          </li>
        ))}
      </ul>
    </main>
  );
}
