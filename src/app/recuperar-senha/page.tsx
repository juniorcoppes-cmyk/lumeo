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
      <h1 className="text-2xl font-semibold">Recuperar senha</h1>
      {sent ? (
        <p className="mt-4 text-sm text-neutral-600">
          Se houver uma conta com esse e-mail, enviamos um link para
          redefinir a senha. Confira também a caixa de spam.
        </p>
      ) : (
        <>
          <p className="mt-2 text-sm text-neutral-600">
            Informe o e-mail da sua conta para receber um link de
            redefinição de senha.
          </p>
          {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
          <form action={requestPasswordReset} className="mt-6 flex flex-col gap-4">
            <input
              type="email"
              name="email"
              placeholder="E-mail"
              required
              className="rounded border px-3 py-2"
            />
            <button type="submit" className="rounded bg-black px-3 py-2 text-white">
              Enviar link
            </button>
          </form>
        </>
      )}
      <p className="mt-4 text-sm text-neutral-600">
        <Link href="/login" className="underline">
          Voltar para o login
        </Link>
      </p>
    </main>
  );
}
