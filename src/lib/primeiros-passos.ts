// PRIMEIROS PASSOS — a trilha que o novo membro vê no Início.
//
// O público do Secret é casal iniciante, gente tímida, quem acha a balada
// liberal intimidante. Essa pessoa entra, olha a tela e não sabe o que fazer
// primeiro — e sair sem fazer nada é o jeito mais comum de nunca voltar.
//
// A trilha é um cartão com três passos que se marcam SOZINHOS, lidos do que
// já existe no banco: não tem "marcar como lido", não tem tabela nova, não
// tem como ficar dessincronizado do estado real do perfil.
//
// SÃO TRÊS, E NÃO CINCO (26/11/2026). A primeira versão pedia também "dê o
// primeiro oi" e "escolha um encontro". Os dois não dependiam só de quem
// está preenchendo: o encontro exige que exista evento marcado, e sem evento
// na agenda a trilha ficava IMPOSSÍVEL de terminar — ela nunca sumia da tela
// de quem já tinha feito a parte dele. Trilha é para deixar o perfil pronto;
// conhecer gente e ir a evento já têm o Comunidade e o Eventos no menu.
//
// Ela não bloqueia nada e some quando acaba. Isso é de propósito: o lema é
// "conexão, não pressa", e uma parede na porta de entrada espanta justamente
// quem a gente quer acolher.

export type EstadoDosPassos = {
  /// Tem foto de perfil (avatar) OU pelo menos uma foto no álbum — quem já
  /// pôs foto no álbum fez o que o passo pede, e o passo não pode continuar
  /// aberto por causa de onde a foto foi parar.
  temFoto: boolean;
  /// Escreveu alguma coisa no "sobre".
  temBio: boolean;
  /// Respondeu interesses/ritmo/ambiente em profile_affinity.
  temAfinidade: boolean;
  /// Ainda esperando o padrinho. Não muda a lista — os três passos são de
  /// perfil e todos funcionam na espera; muda só o texto do cartão, que
  /// convida a usar esse tempo em vez de ficar olhando a tela.
  aguardandoAcesso: boolean;
};

export type Passo = {
  chave: string;
  titulo: string;
  descricao: string;
  href: string;
  botao: string;
  feito: boolean;
};

export function primeirosPassos(e: EstadoDosPassos): Passo[] {
  const passos: Passo[] = [
    {
      chave: "foto",
      titulo: "Coloque uma foto",
      descricao:
        "Pode ser sem mostrar o rosto. O que quase ninguém faz é puxar conversa com um perfil vazio.",
      href: "/perfil",
      botao: "Adicionar foto",
      feito: e.temFoto,
    },
    {
      chave: "bio",
      titulo: "Conte quem vocês são",
      descricao:
        "Duas linhas bastam: o que vocês gostam de fazer num sábado e o que vieram procurar aqui.",
      href: "/perfil",
      botao: "Escrever",
      feito: e.temBio,
    },
    {
      chave: "afinidade",
      titulo: "Diga o que vocês curtem",
      descricao:
        "Interesses, ritmo e o tipo de ambiente que agrada vocês. É daí que sai a lista de quem combina.",
      href: "/perfil/afinidade",
      botao: "Responder",
      feito: e.temAfinidade,
    },
  ];

  return passos;
}

/// Quantos faltam. Zero = a trilha sai da tela.
export function faltam(passos: Passo[]): number {
  return passos.filter((p) => !p.feito).length;
}
