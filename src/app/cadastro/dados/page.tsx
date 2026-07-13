import { EXPERIENCE_LEVEL_LABELS, EXPERIENCE_LEVELS } from "@/lib/experience-level";
import { PasswordInput } from "@/components/PasswordInput";
import { signUp } from "./actions";

export default async function CadastroDadosPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; invite?: string }>;
}) {
  const { error, invite } = await searchParams;

  return (
    <main className="mx-auto max-w-sm px-6 py-16">
      <h1 className="text-2xl font-semibold">Seus dados</h1>
      <p className="mt-2 text-sm text-neutral-600">Etapa 1 de 4</p>
      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
      <form action={signUp} className="mt-6 flex flex-col gap-4">
        {invite && <input type="hidden" name="invite_code" value={invite} />}
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
        <PasswordInput
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
        <select
          name="experience_level"
          required
          defaultValue=""
          className="rounded border px-3 py-2"
        >
          <option value="" disabled>
            Sua experiência no meio liberal
          </option>
          {EXPERIENCE_LEVELS.map((level) => (
            <option key={level} value={level}>
              {EXPERIENCE_LEVEL_LABELS[level]}
            </option>
          ))}
        </select>
        <label className="flex items-start gap-2 text-sm text-neutral-600">
          <input type="checkbox" name="accepted_terms" required className="mt-1" />
          <span>
            Tenho 18 anos ou mais e li e aceito os{" "}
            <a href="/termos" target="_blank" className="underline">
              Termos de Uso
            </a>{" "}
            e a{" "}
            <a href="/privacidade" target="_blank" className="underline">
              Política de Privacidade
            </a>
            .
          </span>
        </label>
        <button type="submit" className="rounded bg-black px-3 py-2 text-white">
          Continuar
        </button>
      </form>
    </main>
  );
}
