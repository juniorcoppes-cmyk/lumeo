// Preço aqui é só o texto de exibição — o valor cobrado de verdade no Asaas
// é PLAN_PRICES em src/app/(logged)/assinatura/actions.ts. Mudar um preço
// exige lembrar do outro (ver AGENTS.md, "Pontos sensíveis").
export const PLANS = [
  {
    id: "essencial",
    name: "Essencial",
    price: "R$ 34,90",
    features: [
      "Acesso completo ao app: Comunidade, linha do tempo, chat e eventos",
      "Verificação de identidade e selo de confiança",
    ],
  },
  {
    id: "plus",
    name: "Plus",
    price: "R$ 59,90",
    features: [
      "Tudo do Essencial",
      "Descontos especiais nos eventos",
      "Lista VIP de prioridade quando um evento atinge lotação máxima",
    ],
  },
] as const;
