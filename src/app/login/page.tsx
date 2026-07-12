import { login } from "./actions";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <main className="mx-auto max-w-sm px-6 py-16">
      <h1 className="text-2xl font-semibold">Entrar</h1>
      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
      <form action={login} className="mt-6 flex flex-col gap-4">
        <input
          type="email"
          name="email"
          placeholder="E-mail"
          required
          className="rounded border px-3 py-2"
        />
        <input
          type="password"
          name="password"
          placeholder="Senha"
          required
          className="rounded border px-3 py-2"
        />
        <button type="submit" className="rounded bg-black px-3 py-2 text-white">
          Entrar
        </button>
      </form>
    </main>
  );
}
