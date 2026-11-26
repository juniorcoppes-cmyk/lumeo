// Datas sempre no fuso de São Paulo, nunca no fuso de quem está rodando.
//
// Por que isto existe: o app roda em Server Components, então `toLocaleString`
// sem `timeZone` usa o fuso do SERVIDOR — que na Vercel é UTC e na máquina de
// desenvolvimento é o de Brasília. O mesmo código mostrava horas diferentes em
// teste e em produção.
//
// Pior: `new Date("2026-07-24T21:00")` (o que o input datetime-local manda, sem
// fuso) era lido como 21h UTC no servidor, ou seja 18h de Brasília. O evento
// ficava gravado 3h adiantado. Na tela ninguém via, porque a exibição também
// era em UTC e os dois erros se anulavam — mas o filtro de "próximos eventos"
// usa o instante de verdade, então o evento sumia da home 3h antes de começar.
//
// Todo evento do Secret é presencial no Brasil, então o fuso é fixo de propósito:
// quem administra digita horário de Brasília e quem lê vê horário de Brasília,
// esteja o servidor onde estiver.
export const FUSO = "America/Sao_Paulo";

/**
 * Converte o que veio de um <input type="datetime-local"> ("2026-07-24T21:00",
 * entendido como horário de Brasília) no instante UTC correspondente.
 */
export function saoPauloParaUtc(local: string): string {
  const comSegundos = local.length === 16 ? `${local}:00` : local;
  // Lê o texto como se fosse UTC, vê que horas isso dá em São Paulo e usa a
  // diferença pra corrigir. Descobrir o deslocamento assim (em vez de fixar
  // -03:00) mantém o cálculo certo se o horário de verão voltar.
  const comoUtc = new Date(`${comSegundos}Z`);
  const relogioSp = new Date(`${relogioLocal(comoUtc)}Z`);
  const deslocamento = comoUtc.getTime() - relogioSp.getTime();
  return new Date(comoUtc.getTime() + deslocamento).toISOString();
}

/** "2026-07-24T21:00" — o valor que o <input type="datetime-local"> espera. */
export function paraDatetimeLocal(iso: string): string {
  return relogioLocal(new Date(iso)).slice(0, 16);
}

/** "24/07/2026, 21:00" */
export function formatarDataHora(iso: string | Date): string {
  return new Date(iso).toLocaleString("pt-BR", {
    timeZone: FUSO,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// "2026-07-24T18:00:00": o relógio de parede em São Paulo naquele instante.
// sv-SE porque é o locale que já sai no formato ISO (mesmo truque usado no
// AccessExpiryWarning).
function relogioLocal(d: Date): string {
  return d.toLocaleString("sv-SE", { timeZone: FUSO }).replace(" ", "T");
}

/// A noite termina às 6 da manhã. Um baile que começa 23h ainda é "próximo"
/// às 2h da madrugada seguinte — quem está lá dentro não considera que o
/// evento já passou. É a mesma régua que o link público do evento usa pra
/// decidir quando fechar.
const AMANHECER = 6;

/**
 * O evento já acabou? Compara pelo relógio de parede de São Paulo dos dois
 * lados — o servidor roda em UTC, e comparar instante com instante faria o
 * evento "passar" 3 horas antes.
 */
export function eventoJaPassou(iso: string | Date, agora: Date = new Date()): boolean {
  const diaDoEvento = relogioLocal(new Date(iso)).slice(0, 10);
  const fimDaNoite = new Date(`${diaDoEvento}T00:00:00Z`);
  fimDaNoite.setUTCDate(fimDaNoite.getUTCDate() + 1);
  fimDaNoite.setUTCHours(AMANHECER);
  const agoraEmSp = new Date(`${relogioLocal(agora)}Z`);
  return agoraEmSp.getTime() > fimDaNoite.getTime();
}
