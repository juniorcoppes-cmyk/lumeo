export default function PrivacidadePage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="text-3xl">Política de Privacidade</h1>
      <p className="mt-2 text-sm text-muted">
        Última atualização: julho de 2026
      </p>

      <div className="mt-8 flex flex-col gap-6 text-foreground/90">
        <section>
          <p>
            Esta política descreve quais dados o Lumeo coleta, por que
            coletamos, e como você pode acessá-los, corrigi-los ou pedir sua
            exclusão, em conformidade com a Lei Geral de Proteção de Dados
            (LGPD).
          </p>
        </section>

        <section>
          <h2 className="text-lg text-foreground">
            1. Dados de cadastro
          </h2>
          <p className="mt-2">
            Nome, e-mail e tipo de perfil (individual/casal) informados no
            cadastro, usados para criar e autenticar sua conta.
          </p>
        </section>

        <section>
          <h2 className="text-lg text-foreground">
            2. Entrada por convite (não pedimos documento)
          </h2>
          <p className="mt-2">
            <strong>O Lumeo não pede documento de identificação nem vídeo de
            verificação.</strong> A entrada é por convite: quem te convida vira
            seu padrinho e responde por você, e a administração revisa seu
            perfil e suas fotos antes da confirmação definitiva. Registramos
            quem convidou quem, e a data em que o apadrinhamento foi aceito ou
            recusado — é isso que sustenta a curadoria.
          </p>
          <p className="mt-2">
            Suas fotos de perfil e de álbum ficam em armazenamento privado, e
            quem vê cada uma depende do que você definiu no seu perfil e das
            conexões que você aceitou. A administração do Lumeo também as vê,
            para a revisão de entrada e para apurar denúncias.
          </p>
        </section>

        <section>
          <h2 className="text-lg text-foreground">
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
          <h2 className="text-lg text-foreground">
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
          <h2 className="text-lg text-foreground">
            5. Cookies
          </h2>
          <p className="mt-2">
            Usamos apenas cookies essenciais de sessão/autenticação, para
            manter você conectado. Não usamos cookies de rastreamento ou
            publicidade de terceiros.
          </p>
        </section>

        <section>
          <h2 className="text-lg text-foreground">
            6. Com quem compartilhamos dados
          </h2>
          <p className="mt-2">
            Não vendemos seus dados. Compartilhamos o mínimo necessário com o
            Asaas (para processar pagamentos) e com o Supabase (nosso
            provedor de banco de dados e armazenamento). Seu perfil e seu
            álbum de fotos só são visíveis a administradores do Lumeo e aos
            usuários que você autorizar.
          </p>
        </section>

        <section>
          <h2 className="text-lg text-foreground">
            7. Seus direitos
          </h2>
          <p className="mt-2">
            Você pode pedir acesso, correção ou exclusão dos seus dados, ou
            encerrar sua conta, entrando em contato pelo e-mail abaixo.
            Atenderemos sua solicitação nos prazos previstos pela LGPD.
          </p>
        </section>

        <section>
          <h2 className="text-lg text-foreground">
            8. Contato
          </h2>
          <p className="mt-2">
            Dúvidas sobre privacidade e dados pessoais podem ser enviadas para{" "}
            <a href="mailto:contato@lumeo.com.br">
              contato@lumeo.com.br
            </a>
            .
          </p>
        </section>
      </div>
    </main>
  );
}
