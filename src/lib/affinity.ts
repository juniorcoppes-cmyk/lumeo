// Camada de afinidade "social e leve" do Secret — alimenta o match por
// compatibilidade (casais iniciantes/tímidos, sem pressão). NADA explícito:
// o foco é conexão social, não prática sexual. Um conjunto de respostas por
// perfil (no casal, é o casal que responde junto).
//
// Adiciona só o que o perfil AINDA NÃO tem: interesses/vibe, ritmo e ambiente.
// O resto do match reaproveita o que já existe no perfil — "quem você procura"
// (looking_for: casais/solteiros/solteiras), nível de experiência e orientação.
// As opções ficam aqui, centralizadas, pra serem fáceis de ajustar depois.

export const INTERESTS = {
  festas: "Festas e baladas",
  musica: "Música",
  danca: "Dança",
  viagem: "Viagem",
  gastronomia: "Gastronomia e vinhos",
  praia: "Praia",
  cultura: "Cultura (cinema, arte)",
  fitness: "Esportes e fitness",
  jogos: "Jogos",
  vida_noturna: "Vida noturna",
} as const;

export const PACE = {
  calma: "Gostamos de ir com calma, conhecer antes",
  depende: "Depende da conexão",
  espontaneo: "Somos mais espontâneos",
} as const;

export const SETTINGS = {
  bar: "Bar / encontro social",
  festa: "Festa ou balada liberal",
  privado: "Evento privado",
  a_dois: "Primeiro a dois / online",
} as const;

export type InterestKey = keyof typeof INTERESTS;
export type PaceKey = keyof typeof PACE;
export type SettingKey = keyof typeof SETTINGS;

export type Affinity = {
  interests: string[];
  pace: string | null;
  settings: string[];
};

// Rótulo legível a partir da chave, pra exibir no perfil e no "por que combinam".
export function labelFor(
  group: Record<string, string>,
  key: string,
): string {
  return group[key] ?? key;
}
