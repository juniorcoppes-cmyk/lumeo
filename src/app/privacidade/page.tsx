export default function PrivacidadePage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="text-3xl font-semibold">Política de Privacidade</h1>
      <p className="mt-2 text-sm text-neutral-500">
        Última atualização: julho de 2026
      </p>

      <div className="mt-8 flex flex-col gap-6 text-neutral-700">
        <section>
          <p>
            Esta política descreve quais dados o Lumeo coleta, por que
            coletamos, e como você pode acessá-los, corrigi-los ou pedir sua
            exclusão, em conformidade com a Lei Geral de Proteção de Dados
            (LGPD).
          </p>
        </section>

        <section>
          <h2 className="text-lg font-medium text-neutral-900">
            1. Dados de cadastro
          </h2>
          <p className="mt-2">
            Nome, e-mail e tipo de perfil (individual/casal) informados no
            cadastro, usados para criar e autenticar sua conta.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-medium text-neutral-900">
            2. Documento e vídeo de verificação
          </h2>
          <p className="mt-2">
            No cadastro, pedimos um documento de identificação e um vídeo
            curto para confirmar sua identidade e idade — essa verificação é
            obrigatória para acessar a plataforma. Esses arquivos ficam em
            armazenamento privado, acessível apenas a você e à administração
            do Lumeo, e são usados exclusivamente para essa finalidade.
          </p>
          <p className="mt-2">
            <strong>Quando sua verificação é aprovada, o documento e o vídeo
            são apagados automaticamente</strong> do nosso armazenamento — só
            fica registrado que a verificação foi aprovada (o selo), não os
            arquivos em si. Se sua verificação for reprovada, os arquivos
            ficam retidos até você reenviar uma nova verificação.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-medium text-neutral-900">
            3. Dados de pagamento
          </h2>
          <p className="mt-2">
            Para assinaturas e cobrança de eventos, processamos seus dados de
            cobrança (como CPF/CNPJ) através do Asaas, nosso processador de
            pagamentos, que também armazena os dados do seu cartão ou meio de
            pagamento — o Lumeo não tem acesso a esses dados diretamente.
            Seus dados de cobrança são mantidos separados do restante do seu
            perfil e visíveis apenas a você.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-medium text-neutral-900">
            4. Fotos, mensagens e uso do app
          </h2>
          <p className="mt-2">
            Fotos que você envia ao seu álbum, mensagens trocadas no chat e
            suas inscrições em eventos ficam armazenadas para o funcionamento
            da plataforma. Fotos da categoria &quot;rosto&quot; só são visíveis a outros
            usuários que você aprovar individualmente.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-medium text-neutral-900">
            5. Cookies
          </h2>
          <p className="mt-2">
            Usamos apenas cookies essenciais de sessão/autenticação, para
            manter você conectado. Não usamos cookies de rastreamento ou
            publicidade de terceiros.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-medium text-neutral-900">
            6. Com quem compartilhamos dados
          </h2>
          <p className="mt-2">
            Não vendemos seus dados. Compartilhamos o mínimo necessário com o
            Asaas (para processar pagamentos) e com o Supabase (nosso
            provedor de banco de dados e armazenamento). Dados de verificação
            e álbum de fotos só são visíveis a administradores do Lumeo e aos
            usuários que você autorizar.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-medium text-neutral-900">
            7. Seus direitos
          </h2>
          <p className="mt-2">
            Você pode pedir acesso, correção ou exclusão dos seus dados, ou
            encerrar sua conta, entrando em contato pelo e-mail abaixo.
            Atenderemos sua solicitação nos prazos previstos pela LGPD.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-medium text-neutral-900">
            8. Contato
          </h2>
          <p className="mt-2">
            Dúvidas sobre privacidade e dados pessoais podem ser enviadas para{" "}
            <a href="mailto:contato@lumeo.com.br" className="underline">
              contato@lumeo.com.br
            </a>
            .
          </p>
        </section>
      </div>
    </main>
  );
}
