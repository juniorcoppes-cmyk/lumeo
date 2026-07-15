import { resendConfirmation } from "./actions";

export default async function ConfirmeEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string; error?: string; sent?: string }>;
}) {
  const { email, error, sent } = await searchParams;

  return (
    <main className="mx-auto max-w-sm px-6 py-16">
      <h1 className="text-2xl">Confirme seu e-mail</h1>
      <p className="mt-2 text-sm text-foreground/90">
        Cadastro recebido! Enviamos um link de confirmação para{" "}
        {email ? <strong className="text-foreground">{email}</strong> : "o seu e-mail"}. Abra
        essa mensagem e clique no link para confirmar seu e-mail. Depois disso, seu acesso é
        liberado assim que seu padrinho aprovar o convite.
      </p>
      <p className="mt-2 text-xs text-muted">
        Não chegou em alguns minutos? Confira a caixa de spam antes de pedir um novo envio.
      </p>

      {sent && <p className="mt-4 text-sm text-green-400">Link reenviado — confira seu e-mail.</p>}
      {error && <p className="mt-4 text-sm text-red-400">{error}</p>}

      {email && (
        <form action={resendConfirmation} className="mt-6">
          <input type="hidden" name="email" value={email} />
          <button type="submit" className="btn-secondary">
            Reenviar e-mail de confirmação
          </button>
        </form>
      )}
    </main>
  );
}
