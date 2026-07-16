export default function TermosPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="text-3xl">Termos de Uso</h1>
      <p className="mt-2 text-sm text-muted">
        Última atualização: julho de 2026
      </p>

      <div className="mt-8 flex flex-col gap-6 text-foreground/90">
        <section>
          <h2 className="text-lg text-foreground">
            1. O que é o Lumeo
          </h2>
          <p className="mt-2">
            O Lumeo é uma plataforma de curadoria para eventos presenciais
            voltados ao público liberal/lifestyle adulto no Brasil. O acesso é
            restrito a maiores de 18 anos, não é aberto ao público e só
            acontece por convite de alguém que já faz parte da comunidade.
          </p>
        </section>

        <section>
          <h2 className="text-lg text-foreground">
            2. Elegibilidade e entrada na comunidade
          </h2>
          <p className="mt-2">
            Ao se cadastrar, você declara ter 18 anos ou mais. O cadastro só é
            possível através de um link de convite enviado por um usuário já
            verificado, que passa a ser seu padrinho — é ele quem aceita ou
            recusa apadrinhar seu perfil, e a recusa impede o acesso. Depois do
            aceite, a administração revisa seu perfil e suas fotos e dá a
            confirmação definitiva, podendo revogar o acesso.
          </p>
          <p className="mt-2">
            A curadoria do Lumeo é social e baseada na responsabilidade de quem
            convida — <strong>não conferimos documento de identidade</strong>.
            Você é responsável pela veracidade do que declara, inclusive sua
            idade; perfis falsos ou que indiquem menoridade são removidos assim
            que identificados.
          </p>
        </section>

        <section>
          <h2 className="text-lg text-foreground">
            3. Conduta na plataforma e nos eventos
          </h2>
          <p className="mt-2">
            Discrição é uma regra central: não é permitido divulgar, fora da
            plataforma, informações que identifiquem outros usuários,
            participantes ou eventos. O Lumeo pode suspender ou encerrar
            contas que violem esta regra, assediem outros usuários, forneçam
            informações falsas ou usem a plataforma para fins diferentes de
            sua proposta (curadoria de encontros e eventos entre adultos).
          </p>
        </section>

        <section>
          <h2 className="text-lg text-foreground">
            4. Assinaturas, eventos pagos e cobrança
          </h2>
          <p className="mt-2">
            Planos de assinatura são cobrados recorrentemente através do
            Asaas, nosso processador de pagamentos. Em caso de falha no
            pagamento recorrente, sua assinatura entra em um período de
            carência de 2 dias antes de ser considerada inadimplente. Alguns
            eventos têm cobrança avulsa, informada antes da inscrição.
            Cancelamentos e reembolsos seguem a política informada em cada
            evento ou plano no momento da contratação.
          </p>
        </section>

        <section>
          <h2 className="text-lg text-foreground">
            5. Fotos e álbum de perfil
          </h2>
          <p className="mt-2">
            Fotos que você envia para seu álbum (&quot;corpo&quot;) ficam visíveis a
            qualquer usuário verificado. Fotos na categoria &quot;rosto&quot; só ficam
            visíveis a outros usuários depois que você aprova um pedido de
            acesso individual. Você pode remover suas fotos ou negar pedidos
            de acesso a qualquer momento em seu perfil.
          </p>
        </section>

        <section>
          <h2 className="text-lg text-foreground">
            6. Moderação e encerramento de conta
          </h2>
          <p className="mt-2">
            Administradores do Lumeo podem reprovar verificações, cancelar
            inscrições em eventos e suspender contas que violem estes termos.
            Você pode encerrar sua conta a qualquer momento entrando em
            contato pelo e-mail abaixo.
          </p>
        </section>

        <section>
          <h2 className="text-lg text-foreground">
            7. Isenção de responsabilidade
          </h2>
          <p className="mt-2">
            O Lumeo faz a curadoria social dos participantes — por convite,
            apadrinhamento e revisão de perfil —, mas <strong>não confere
            documento de identidade</strong>, não organiza nem supervisiona
            diretamente todos os eventos indicados por usuários, nem garante a
            conduta ou a identidade real de outros participantes. O uso da
            plataforma e a participação em eventos são por sua conta e risco.
          </p>
        </section>

        <section>
          <h2 className="text-lg text-foreground">
            8. Contato
          </h2>
          <p className="mt-2">
            Dúvidas sobre estes termos podem ser enviadas para{" "}
            <a href="mailto:contato@lumeo.com.br">
              contato@lumeo.com.br
            </a>
            .
          </p>
        </section>

        <p className="mt-4 text-sm text-muted">
          Veja também nossa{" "}
          <a href="/privacidade">
            Política de Privacidade
          </a>
          , sobre como tratamos seus dados, e o{" "}
          <a href="/regras">
            Manual de Boas Convivências
          </a>
          .
        </p>
      </div>
    </main>
  );
}
