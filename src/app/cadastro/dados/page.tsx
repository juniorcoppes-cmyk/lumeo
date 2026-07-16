import { EXPERIENCE_LEVEL_LABELS, EXPERIENCE_LEVELS } from "@/lib/experience-level";
import { PasswordInput } from "@/components/PasswordInput";
import { createClient } from "@/lib/supabase/server";
import { getPlans } from "@/lib/plans";
import { signUp } from "./actions";

export default async function CadastroDadosPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; code?: string }>;
}) {
  const { error, code } = await searchParams;
  const supabase = await createClient();

  const invitePreview = code
    ? (await supabase.rpc("get_platform_invite_preview", { p_code: code })).data?.[0]
    : null;
  const inviteValid = !!invitePreview?.valid;

  if (!code || !inviteValid) {
    return (
      <main className="mx-auto max-w-sm px-6 py-16">
        <h1 className="text-2xl">Convite necessário</h1>
        <p className="mt-2 text-sm text-muted">
          O cadastro no Lumeo só é possível através de um link de convite
          enviado por alguém que já faz parte da comunidade. Se você recebeu
          um link, use-o diretamente — se o link não abrir o formulário, pode
          ter expirado ou já ter sido usado. Peça um novo convite.
        </p>
      </main>
    );
  }

  const plans = await getPlans(supabase);

  return (
    <main className="mx-auto max-w-sm px-6 py-16">
      <h1 className="text-2xl">Seus dados</h1>
      <p className="mt-2 text-sm text-muted">
        Você foi convidado por <strong className="text-foreground">{invitePreview.inviter_name}</strong>.
      </p>
      {error && <p className="mt-4 text-sm text-red-400">{error}</p>}
      <form action={signUp} className="mt-6 flex flex-col gap-4">
        <input type="hidden" name="platform_invite_code" value={code} />
        <input
          type="text"
          name="name"
          placeholder="Nome"
          required
          className="input"
        />
        <p className="-mt-2 text-xs text-muted">
          É o nome que vai aparecer no seu perfil pros outros usuários — use como
          você quer ser reconhecido(a) pela comunidade.
        </p>
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
        <p className="-mt-2 text-xs text-muted">
          <strong className="text-foreground">Perfil casal é uma conta só:</strong> vocês
          dois entram com este mesmo e-mail e senha, cada um no seu celular — e podem usar
          ao mesmo tempo. O link de convite vale só para este cadastro, agora; no segundo
          aparelho é só abrir{" "}
          <strong className="text-foreground">www.lumeo.app.br</strong> e clicar em “Entrar”,
          sem precisar de link.
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

        <label className="flex flex-col gap-1 text-sm">
          Plano
          <select name="preferred_plan" defaultValue="" className="input">
            <option value="">Período de teste grátis (7 dias após aprovação)</option>
            {plans.map((plan) => (
              <option key={plan.id} value={plan.id}>
                {plan.name} — R$ {plan.price.toFixed(2)}/mês
              </option>
            ))}
          </select>
        </label>
        <p className="-mt-2 text-xs text-muted">
          A cobrança só é configurada depois, em Assinatura — aqui é só pra
          já sabermos sua preferência.
        </p>

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
