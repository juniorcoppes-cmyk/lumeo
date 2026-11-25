import { createClient } from "@/lib/supabase/server";
import { formatarDataHora } from "@/lib/datas";
import { updateRequestStatus } from "./actions";

type AccessRequest = {
  id: string;
  apelido: string;
  contact_type: string;
  contact_value: string;
  cidade: string | null;
  profile_type: string;
  reason: string | null;
  status: string;
  created_at: string;
};

const STATUS_LABEL: Record<string, string> = {
  novo: "Novo",
  conversando: "Conversando",
  aprovado: "Aprovado",
  recusado: "Recusado",
};

export default async function AdminSolicitacoesPage() {
  const supabase = await createClient();
  const { data: requests } = await supabase
    .from("access_requests")
    .select("id, apelido, contact_type, contact_value, cidade, profile_type, reason, status, created_at")
    .order("created_at", { ascending: false });

  const lista = (requests ?? []) as AccessRequest[];

  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="text-2xl">Solicitações de ingresso</h1>
      <p className="mt-2 text-sm text-muted">
        Pessoas que pediram para entrar sem convite. Fale com elas pelo contato
        informado; quando aprovar, faça a confirmação e libere o acesso.
      </p>

      <ul className="mt-6 flex flex-col gap-3">
        {lista.map((r) => (
          <li key={r.id} className="card flex flex-col gap-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-medium text-foreground">
                {r.apelido}{" "}
                <span className="text-sm font-normal text-muted">
                  · {r.profile_type === "casal" ? "Casal" : "Solteiro(a)"}
                  {r.cidade ? ` · ${r.cidade}` : ""}
                </span>
              </span>
              <span className="text-xs text-muted">{formatarDataHora(r.created_at)}</span>
            </div>

            <div className="text-sm">
              <span className="text-muted">
                {r.contact_type === "whatsapp" ? "WhatsApp" : "E-mail"}:{" "}
              </span>
              <span className="text-foreground">{r.contact_value}</span>
            </div>

            {r.reason && <p className="text-sm text-foreground/90">“{r.reason}”</p>}

            <form action={updateRequestStatus} className="mt-1 flex items-center gap-2">
              <input type="hidden" name="id" value={r.id} />
              <select
                name="status"
                defaultValue={r.status}
                className="input !py-1 !text-sm"
              >
                {Object.entries(STATUS_LABEL).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
              <button type="submit" className="btn-secondary !px-3 !py-1 !text-xs">
                Salvar
              </button>
            </form>
          </li>
        ))}
        {lista.length === 0 && (
          <p className="text-muted">Nenhuma solicitação ainda.</p>
        )}
      </ul>
    </main>
  );
}
