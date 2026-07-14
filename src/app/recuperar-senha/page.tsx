import Link from "next/link";
import { requestPasswordReset } from "./actions";

export default async function RecuperarSenhaPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; sent?: string }>;
}) {
  const { error, sent } = await searchParams;

  return (
    <main className="mx-auto max-w-sm px-6 py-16">
      <h1 className="text-2xl">Recuperar senha</h1>
      {sent ? (
        <p className="mt-4 text-sm text-muted">
          Se houver uma conta com esse e-mail, enviamos um link para
          redefinir a senha. Confira também a caixa de spam.
        </p>
      ) : (
        <>
          <p className="mt-2 text-sm text-muted">
            Informe o e-mail da sua conta para receber um link de
            redefinição de senha.
          </p>
          {error && <p className="mt-4 text-sm text-red-400">{error}</p>}
          <form action={requestPasswordReset} className="mt-6 flex flex-col gap-4">
            <input
              type="email"
              name="email"
              placeholder="E-mail"
              required
              className="input"
            />
            <button type="submit" className="btn-primary">
              Enviar link
            </button>
          </form>
        </>
      )}
      <p className="mt-4 text-sm text-muted">
        <Link href="/login">
          Voltar para o login
        </Link>
      </p>
    </main>
  );
}
