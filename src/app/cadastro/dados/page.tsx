import Link from "next/link";
import { SobreOLumeo } from "@/components/SobreOLumeo";
import { CadastroForm } from "@/components/CadastroForm";
import { createClient } from "@/lib/supabase/server";
import { getPlans } from "@/lib/plans";

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
          O cadastro no Secret só é possível através de um link de convite
          enviado por alguém que já faz parte da comunidade. Se você recebeu
          um link, use-o diretamente — se o link não abrir o formulário, pode
          ter expirado ou já ter sido usado.
        </p>
        {/* Em vez de parede, uma porta: quem não tem convite deixa o contato. */}
        <Link href="/participar" className="btn-primary mt-4 inline-block">
          Não tenho convite — quero participar
        </Link>
        {/* Quem chega aqui sem convite vale saber o que está pedindo. */}
        <SobreOLumeo className="mt-8 border-t border-line pt-8" />
      </main>
    );
  }

  const plans = await getPlans(supabase);

  return (
    <main className="mx-auto max-w-sm px-6 py-16">
      <p className="text-sm text-muted">
        <strong className="text-foreground">{invitePreview.inviter_name}</strong> te convidou
        para o
      </p>
      <h1 className="mt-1 font-display text-4xl text-accent">Secret</h1>

      {/* Quem chega por um convite não faz ideia do que é o Secret — antes
          disto caía direto no formulário. O texto vem primeiro, e de propósito
          aberto: é o que diferencia o app, não pode depender de um clique. */}
      <SobreOLumeo className="mt-5" />

      <hr className="mt-8 border-line" />

      <h2 className="mt-8 text-2xl">Seus dados</h2>
      <p className="mt-1 text-sm text-muted">
        Seu convite é de {invitePreview.inviter_name}, que vira seu padrinho — é quem responde
        por você aqui dentro.
      </p>
      {error && <p className="mt-4 text-sm text-red-400">{error}</p>}
      <CadastroForm code={code} plans={plans} />
    </main>
  );
}
