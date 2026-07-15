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
      <h1 className="text-2xl">Seus dados</h1>
      <p className="mt-2 text-sm text-muted">Etapa 1 de 4</p>
      {error && <p className="mt-4 text-sm text-red-400">{error}</p>}
      <form action={signUp} className="mt-6 flex flex-col gap-4">
        {invite && <input type="hidden" name="invite_code" value={invite} />}
        <input
          type="text"
          name="name"
          placeholder="Nome"
          required
          className="input"
        />
        <input
          type="email"
          name="email"
          placeholder="E-mail"
          required
          className="input"
        />
        <PasswordInput
          name="password"
          placeholder="Senha"
          required
          minLength={6}
          className="input"
        />
        <PasswordInput
          name="password_confirmation"
          placeholder="Confirmar senha"
          required
          minLength={6}
          className="input"
        />
        <select name="profile_type" required className="input">
          <option value="individual">Individual</option>
          <option value="casal">Casal</option>
        </select>
        <p className="-mt-2 text-xs text-muted">
          Seu perfil só é aprovado com no mínimo 6 fotos no álbum. Perfil
          casal precisa, além disso, de pelo menos uma foto de corpo
          inteiro de cada um dos dois — perfil com foto de só uma pessoa
          não é aceito como casal.
        </p>
        <select
          name="experience_level"
          required
          defaultValue=""
          className="input"
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
        <label className="flex items-start gap-2 text-sm text-muted">
          <input type="checkbox" name="accepted_terms" required className="mt-1" />
          <span>
            Tenho 18 anos ou mais e li e aceito os{" "}
            <a href="/termos" target="_blank">
              Termos de Uso
            </a>
            , a{" "}
            <a href="/privacidade" target="_blank">
              Política de Privacidade
            </a>{" "}
            e o{" "}
            <a href="/regras" target="_blank">
              Manual de Boas Convivências
            </a>
            .
          </span>
        </label>
        <button type="submit" className="btn-primary">
          Continuar
        </button>
      </form>
    </main>
  );
}
