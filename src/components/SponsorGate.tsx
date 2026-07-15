import { respondSponsorship } from "@/app/(logged)/sponsor-actions";

type PendingSponsorship = { id: string; name: string };

export function SponsorGate({ items }: { items: PendingSponsorship[] }) {
  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col items-center justify-center gap-6 px-6 py-16">
      <h1 className="text-2xl text-center">Apadrinhamento pendente</h1>
      <p className="text-center text-sm text-muted">
        {items.length === 1
          ? "Alguém usou seu link de convite pro Lumeo."
          : `${items.length} pessoas usaram seu link de convite pro Lumeo.`}{" "}
        Antes de continuar usando o app, decida se aceita apadrinhar — só depois disso você
        libera seu próprio acesso de novo.
      </p>
      <div className="flex w-full flex-col gap-3">
        {items.map((p) => (
          <div key={p.id} className="card flex flex-wrap items-center justify-between gap-3">
            <span className="font-medium text-foreground">{p.name}</span>
            <div className="flex gap-2">
              <form action={respondSponsorship}>
                <input type="hidden" name="user_id" value={p.id} />
                <input type="hidden" name="decision" value="accept" />
                <button type="submit" className="btn-primary">
                  Aceitar
                </button>
              </form>
              <form action={respondSponsorship}>
                <input type="hidden" name="user_id" value={p.id} />
                <input type="hidden" name="decision" value="reject" />
                <button type="submit" className="btn-secondary">
                  Recusar
                </button>
              </form>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
