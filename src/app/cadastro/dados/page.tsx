import { signUp } from "./actions";

export default async function CadastroDadosPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <main className="mx-auto max-w-sm px-6 py-16">
      <h1 className="text-2xl font-semibold">Seus dados</h1>
      <p className="mt-2 text-sm text-neutral-600">Etapa 1 de 4</p>
      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
      <form action={signUp} className="mt-6 flex flex-col gap-4">
        <input
          type="text"
          name="name"
          placeholder="Nome"
          required
          className="rounded border px-3 py-2"
        />
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
          minLength={6}
          className="rounded border px-3 py-2"
        />
        <select name="profile_type" required className="rounded border px-3 py-2">
          <option value="individual">Individual</option>
          <option value="casal">Casal</option>
        </select>
        <button type="submit" className="rounded bg-black px-3 py-2 text-white">
          Continuar
        </button>
      </form>
    </main>
  );
}
