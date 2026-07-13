export const GENDER_OPTIONS = ["homem", "mulher"] as const;
export type Gender = (typeof GENDER_OPTIONS)[number];
export const GENDER_LABELS: Record<Gender, string> = {
  homem: "Homem",
  mulher: "Mulher",
};

export const ORIENTATION_OPTIONS = ["hetero", "bissexual", "bissexual_iniciando"] as const;
export type Orientation = (typeof ORIENTATION_OPTIONS)[number];
export const ORIENTATION_LABELS: Record<Orientation, string> = {
  hetero: "Hetero",
  bissexual: "Bissexual",
  bissexual_iniciando: "Bissexual iniciando",
};

export const LOOKING_FOR_OPTIONS = ["casais", "solteiros", "solteiras"] as const;
export type LookingFor = (typeof LOOKING_FOR_OPTIONS)[number];
export const LOOKING_FOR_LABELS: Record<LookingFor, string> = {
  casais: "Casais",
  solteiros: "Solteiros",
  solteiras: "Solteiras",
};

export const CONNECTION_TYPE_OPTIONS = [
  "amigos_sociais",
  "amigos_intimos",
  "amigos_virtuais",
] as const;
export type ConnectionType = (typeof CONNECTION_TYPE_OPTIONS)[number];
export const CONNECTION_TYPE_LABELS: Record<ConnectionType, string> = {
  amigos_sociais: "Amigos sociais",
  amigos_intimos: "Amigos íntimos",
  amigos_virtuais: "Amigos virtuais",
};

export const RATING_TAG_OPTIONS = [
  "bonito",
  "bom_papo",
  "gostoso",
  "sensual",
  "interessante",
] as const;
export type RatingTag = (typeof RATING_TAG_OPTIONS)[number];
export const RATING_TAG_LABELS: Record<RatingTag, string> = {
  bonito: "Bonito",
  bom_papo: "Bom papo",
  gostoso: "Gostoso",
  sensual: "Sensual",
  interessante: "Interessante",
};

// Formulário usa texto livre "DD/MM/AAAA" em vez do seletor nativo de data
// (o wheel picker do celular obriga a rolar ano a ano até a década de
// nascimento — digitar é bem mais rápido). Convertido pra "AAAA-MM-DD"
// (formato da coluna `date` do Postgres) antes de salvar.
export function parseBirthDateInput(value: string | null | undefined): string | null {
  if (!value) return null;
  const match = value.trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!match) return null;
  const [, day, month, year] = match;
  return `${year}-${month}-${day}`;
}

export function formatBirthDateForInput(isoDate: string | null | undefined): string {
  if (!isoDate) return "";
  const [year, month, day] = isoDate.split("-");
  if (!year || !month || !day) return "";
  return `${day}/${month}/${year}`;
}

export function calculateAge(birthDate: string | null | undefined): number | null {
  if (!birthDate) return null;
  const birth = new Date(birthDate);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const hasHadBirthdayThisYear =
    today.getMonth() > birth.getMonth() ||
    (today.getMonth() === birth.getMonth() && today.getDate() >= birth.getDate());
  if (!hasHadBirthdayThisYear) age--;
  return age;
}
