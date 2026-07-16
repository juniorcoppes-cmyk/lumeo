import Link from "next/link";
import { SobreOLumeo } from "@/components/SobreOLumeo";

export default function ComoFuncionaPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="text-3xl">Como funciona</h1>

      <SobreOLumeo className="mt-4 !text-base" />

      <div className="mt-10 flex flex-col gap-8 text-sm text-foreground/90">
        <section>
          <h2 className="text-lg text-foreground">Só se entra por convite</h2>
          <p className="mt-2">
            Não existe cadastro aberto no Lumeo. Para entrar, é preciso um link
            de convite enviado por alguém que já faz parte da comunidade. Cada
            link funciona uma única vez, para uma única pessoa.
          </p>
        </section>

        <section>
          <h2 className="text-lg text-foreground">
            Quem te convida responde por você
          </h2>
          <p className="mt-2">
            Quem envia o convite vira seu padrinho. Assim que você se cadastra,
            ele precisa aceitar ou recusar apadrinhar seu perfil antes de
            conseguir usar o app de novo — a decisão não fica esperando. Se
            aceitar, seu acesso abre na hora. Se recusar, não abre.
          </p>
          <p className="mt-2">
            É daí que vem a curadoria: não conferimos documento de identidade.
            A confiança aqui é social, e quem apadrinha assume o risco de quem
            trouxe. Convide só quem você conhece de verdade.
          </p>
        </section>

        <section>
          <h2 className="text-lg text-foreground">
            A administração confirma depois
          </h2>
          <p className="mt-2">
            Depois do aceite do padrinho, a administração revisa seu perfil e
            suas fotos e dá a confirmação definitiva — e pode revogar o acesso
            se algo não estiver de acordo com as{" "}
            <Link href="/regras">regras da comunidade</Link>. O álbum precisa de
            no mínimo 6 fotos; perfil casal precisa de pelo menos uma foto de
            corpo inteiro de cada um dos dois.
          </p>
        </section>

        <section>
          <h2 className="text-lg text-foreground">
            Discrição é regra, não recurso
          </h2>
          <p className="mt-2">
            Nada do que acontece aqui dentro sai daqui. Divulgar, fora da
            plataforma, informação que identifique outra pessoa, participante ou
            evento é motivo de banimento. Você controla quem vê cada foto sua, e
            a localização, quando ativada, nunca aparece como endereço ou
            distância exata — só como região aproximada.
          </p>
        </section>

        <section>
          <h2 className="text-lg text-foreground">Eventos e assinatura</h2>
          <p className="mt-2">
            Os encontros presenciais são curados e aparecem no app com data,
            local e lista de presença confirmada. O acesso à comunidade é por
            assinatura, com período de teste grátis de 7 dias depois da
            aprovação — veja os <Link href="/planos">planos</Link>.
          </p>
        </section>
      </div>

      <p className="mt-10 text-sm text-muted">
        Leia também os <Link href="/termos">Termos de Uso</Link>, a{" "}
        <Link href="/privacidade">Política de Privacidade</Link> e o{" "}
        <Link href="/regras">Manual de Boas Convivências</Link>.
      </p>
    </main>
  );
}
