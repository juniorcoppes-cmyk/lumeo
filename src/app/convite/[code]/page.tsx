import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { aceitarConvite } from "./actions";

export default async function ConvitePage({
  params,
  searchParams,
}: {
  params: Promise<{ code: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { code } = await params;
  const { error } = await searchParams;
  const supabase = await createClient();

  const { data: preview } = (await supabase
    .rpc("get_invite_preview", { p_code: code })
    .maybeSingle()) as {
    data: {
      event_id: string;
      event_title: string;
      event_date: string;
      location: string;
      inviter_name: string;
    } | null;
  };

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!preview) {
    return (
      <main className="mx-auto max-w-sm px-6 py-16">
        <h1 className="text-2xl font-semibold">Convite não encontrado</h1>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-sm px-6 py-16">
      <h1 className="text-2xl font-semibold">Você foi indicado(a)</h1>
      <p className="mt-2 text-neutral-600">
        {preview.inviter_name} indicou o evento <strong>{preview.event_title}</strong>
      </p>
      <p className="mt-2 text-sm text-neutral-500">
        {new Date(preview.event_date).toLocaleString("pt-BR")} · {preview.location}
      </p>

      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

      {user ? (
        <form action={aceitarConvite} className="mt-6">
          <input type="hidden" name="code" value={code} />
          <button type="submit" className="rounded bg-black px-4 py-2 text-white">
            Ver evento
          </button>
        </form>
      ) : (
        <div className="mt-6 flex gap-4 text-sm font-medium">
          <Link href={`/login?next=${encodeURIComponent(`/convite/${code}`)}`} className="underline">
            Entrar
          </Link>
          <Link href="/cadastro" className="underline">
            Cadastre-se
          </Link>
        </div>
      )}
    </main>
  );
}
