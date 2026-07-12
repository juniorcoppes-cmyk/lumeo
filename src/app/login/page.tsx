export default function LoginPage() {
  return (
    <main className="mx-auto max-w-sm px-6 py-16">
      <h1 className="text-2xl font-semibold">Entrar</h1>
      <form className="mt-6 flex flex-col gap-4">
        <input
          type="email"
          placeholder="E-mail"
          className="rounded border px-3 py-2"
        />
        <input
          type="password"
          placeholder="Senha"
          className="rounded border px-3 py-2"
        />
        <button type="submit" className="rounded bg-black px-3 py-2 text-white">
          Entrar
        </button>
      </form>
    </main>
  );
}
