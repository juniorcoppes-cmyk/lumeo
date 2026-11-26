// PRIMEIROS PASSOS — a trilha que o novo membro vê no Início.
//
// O público do Secret é casal iniciante, gente tímida, quem acha a balada
// liberal intimidante. Essa pessoa entra, olha a tela e não sabe o que fazer
// primeiro — e sair sem fazer nada é o jeito mais comum de nunca voltar.
//
// A trilha é um cartão com cinco passos que se marcam SOZINHOS, lidos do que
// já existe no banco: não tem "marcar como lido", não tem tabela nova, não
// tem como ficar dessincronizado do estado real do perfil.
//
// Ela não bloqueia nada e some quando acaba. Isso é de propósito: o lema é
// "conexão, não pressa", e uma parede na porta de entrada espanta justamente
// quem a gente quer acolher.

export type EstadoDosPassos = {
  /// Tem foto de perfil (avatar) ou pelo menos uma foto no álbum.
  temFoto: boolean;
  /// Escreveu alguma coisa no "sobre".
  temBio: boolean;
  /// Respondeu interesses/ritmo/ambiente em profile_affinity.
  temAfinidade: boolean;
  /// Já pediu ou recebeu conexão de alguém.
  temConexao: boolean;
  /// Já confirmou presença em algum evento.
  temEvento: boolean;
  /// Ainda esperando o padrinho: metade do app não abre, então a trilha
  /// mostra só o que ele CONSEGUE fazer enquanto espera.
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
    {
      chave: "conexao",
      titulo: "Dê o primeiro oi",
      descricao:
        "A lista de quem combina com vocês já está pronta, com o porquê de cada combinação. Olhar não avisa ninguém.",
      href: "/comunidade/combinam",
      botao: "Ver quem combina",
      feito: e.temConexao,
    },
    {
      chave: "evento",
      titulo: "Escolha um encontro",
      descricao:
        "Num evento dá pra conhecer gente sem ter que puxar assunto do nada — e você já chega sabendo quem vai.",
      href: "/eventos",
      botao: "Ver a agenda",
      feito: e.temEvento,
    },
  ];

  // Esperando o padrinho: conexão e evento ainda estão trancados, e oferecer
  // um botão que leva a uma porta fechada é pior do que não oferecer.
  return e.aguardandoAcesso
    ? passos.filter((p) => ["foto", "bio", "afinidade"].includes(p.chave))
    : passos;
}

/// Quantos faltam. Zero = a trilha sai da tela.
export function faltam(passos: Passo[]): number {
  return passos.filter((p) => !p.feito).length;
}
