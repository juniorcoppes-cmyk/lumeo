"use client";

import { useState } from "react";
import {
  EXPERIENCE_LEVEL_HINTS,
  EXPERIENCE_LEVEL_LABELS,
  EXPERIENCE_LEVELS,
} from "@/lib/experience-level";
import { PasswordInput } from "@/components/PasswordInput";
import { signUp } from "@/app/cadastro/dados/actions";

// Formulário de cadastro. É client component por um motivo só: a orientação do
// campo "Nome" muda conforme o tipo de perfil. No individual, o nome é da
// pessoa; no CASAL, o certo é um nome/apelido fictício do casal (não os nomes
// reais dos dois) — e isso precisa aparecer na hora em que ele marca "Casal",
// não num texto fixo que ele nem lê. O resto do formulário é igual ao de antes;
// a action de servidor (signUp) continua pegando os campos pelo name nativo.
export function CadastroForm({
  code,
  plans,
}: {
  code: string;
  plans: { id: string; name: string; price: number }[];
}) {
  const [tipo, setTipo] = useState<"individual" | "casal">("individual");
  const ehCasal = tipo === "casal";

  return (
    <form action={signUp} className="mt-6 flex flex-col gap-4">
      <input type="hidden" name="platform_invite_code" value={code} />
      <input
        type="text"
        name="name"
        placeholder={ehCasal ? "Nome do casal" : "Nome"}
        required
        className="input"
      />
      {ehCasal ? (
        <p className="-mt-2 text-xs text-muted">
          É o nome que vai aparecer no perfil de vocês dois. Criem um{" "}
          <strong className="text-foreground">nome de casal, fictício</strong> — um
          apelido só de vocês (ex.: “M&amp;J”, “Os Corujas”). Não usem os nomes
          reais: a graça do Secret é esse anonimato.
        </p>
      ) : (
        <p className="-mt-2 text-xs text-muted">
          É o nome que vai aparecer no seu perfil pros outros usuários — use como
          você quer ser reconhecido(a) pela comunidade.
        </p>
      )}
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
      <select
        name="profile_type"
        required
        value={tipo}
        onChange={(e) => setTipo(e.target.value as "individual" | "casal")}
        className="input"
      >
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
        <strong className="text-foreground">www.socialsecret.com.br</strong> e clicar em “Entrar”,
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
        {/* No cadastro vai a explicação junto: é a primeira vez que a
            pessoa escolhe, e "até 6 meses" sozinho não diz se conta desde
            a primeira festa ou desde a primeira conversa. */}
        {EXPERIENCE_LEVELS.map((level) => (
          <option key={level} value={level}>
            {EXPERIENCE_LEVEL_LABELS[level]} — {EXPERIENCE_LEVEL_HINTS[level]}
          </option>
        ))}
      </select>

      <label className="flex flex-col gap-1 text-sm">
        Plano
        <select name="preferred_plan" defaultValue="" className="input">
          <option value="">6 meses grátis (fase de lançamento, após a aprovação)</option>
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
  );
}
