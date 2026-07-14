export default function RegrasPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="text-3xl font-semibold">Manual de Boas Convivências</h1>
      <p className="mt-1 text-sm font-medium text-neutral-600">(Código de Conduta)</p>
      <p className="mt-2 text-sm text-neutral-500">Última atualização: julho de 2026</p>

      <p className="mt-6 text-neutral-700">
        O Lumeo existe para aproximar pessoas do meio liberal com leveza e
        respeito. Estas regras existem para que todo mundo se sinta seguro
        pra usar o app — e valem tanto aqui dentro quanto nos encontros
        presenciais que ele viabiliza.
      </p>

      <div className="mt-8 flex flex-col gap-6 text-neutral-700">
        <section>
          <h2 className="text-lg font-medium text-neutral-900">
            1. Consentimento sempre, sem exceção
          </h2>
          <p className="mt-2">
            Nada acontece sem consentimento claro — presencial ou digital.
            Insistência após um &quot;não&quot; (mesmo indireto), pressão ou
            constrangimento não são tolerados. Isso vale pra conversas,
            fotos, contato físico em evento, tudo.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-medium text-neutral-900">2. Autenticidade</h2>
          <p className="mt-2">
            Use fotos e informações reais. Perfis falsos, fotos de
            terceiros ou identidade forjada resultam em banimento. É
            proibido menor de idade na plataforma — a verificação existe
            justamente pra isso, e tentar burlar é motivo de banimento
            imediato.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-medium text-neutral-900">
            3. Comunicação respeitosa
          </h2>
          <p className="mt-2">
            Sem spam, propaganda ou divulgação comercial não solicitada.
            Sem mensagens ofensivas, discurso de ódio, ameaças ou assédio.
            Sem insistência depois que a outra pessoa demonstrou
            desinteresse ou parou de responder. Fotos íntimas/explícitas só
            podem ser enviadas se a outra pessoa topar — nunca sem pedir.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-medium text-neutral-900">
            4. Discrição é regra, não favor
          </h2>
          <p className="mt-2">
            O que acontece no Lumeo (perfis, fotos, conversas, quem você
            conheceu) fica no Lumeo. Compartilhar informação ou foto de
            outro usuário fora da plataforma, sem autorização, é violação
            grave. Respeite o modo discreto de quem ativou — não exponha,
            marque ou comente sobre a presença de alguém que optou por
            discrição.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-medium text-neutral-900">
            5. Perfis e fotos do álbum
          </h2>
          <p className="mt-2">
            Sua verificação só é aprovada com no mínimo 6 fotos no álbum.
            Perfil casal precisa, além disso, de pelo menos uma foto de
            corpo inteiro de cada um dos dois — perfil com foto de só uma
            pessoa não é aceito como casal.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-medium text-neutral-900">
            6. Nos encontros presenciais
          </h2>
          <p className="mt-2">
            Combinados e limites definidos antes do encontro devem ser
            respeitados no local. Comportamento invasivo, insistente ou
            desrespeitoso em evento pode levar à remoção do local e
            banimento da plataforma.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-medium text-neutral-900">
            7. O que gera denúncia e banimento
          </h2>
          <p className="mt-2">
            Qualquer um dos itens acima pode ser denunciado direto no
            perfil da pessoa. Casos são avaliados pela administração;
            dependendo da gravidade, a consequência pode ser advertência,
            suspensão temporária ou banimento definitivo — sem reembolso de
            assinatura em caso de banimento por violação.
          </p>
        </section>
      </div>

      <p className="mt-8 text-sm text-neutral-500">
        Veja também nossos{" "}
        <a href="/termos" className="underline">
          Termos de Uso
        </a>{" "}
        e nossa{" "}
        <a href="/privacidade" className="underline">
          Política de Privacidade
        </a>
        .
      </p>
    </main>
  );
}
