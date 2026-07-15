import Link from "next/link";
import { PasswordInput } from "@/components/PasswordInput";
import { login } from "./actions";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string; confirmed?: string }>;
}) {
  const { error, next, confirmed } = await searchParams;

  return (
    <main className="mx-auto max-w-sm px-6 py-16">
      <h1 className="text-2xl">Entrar</h1>
      {confirmed && (
        <p className="mt-4 text-sm text-green-400">
          E-mail confirmado! Faça login com seu e-mail e senha para continuar.
        </p>
      )}
      {error && <p className="mt-4 text-sm text-red-400">{error}</p>}
      <form action={login} className="mt-6 flex flex-col gap-4">
        {next && <input type="hidden" name="next" value={next} />}
        <input
          type="email"
          name="email"
          placeholder="E-mail"
          required
          className="input"
        />
        <PasswordInput name="password" placeholder="Senha" required className="input" />
        <button type="submit" className="btn-primary">
          Entrar
        </button>
      </form>
      <p className="mt-4 text-sm text-muted">
        <Link href="/recuperar-senha">
          Esqueci minha senha
        </Link>
      </p>
      <p className="mt-2 text-sm text-muted">
        Ainda não tem conta?{" "}
        <Link href="/cadastro/dados">
          Criar conta
        </Link>
      </p>
    </main>
  );
}
