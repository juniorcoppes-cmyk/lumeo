// Quem do casal está falando. Guardamos 'p1'/'p2' (pessoa 1 / pessoa 2 do
// perfil); o rótulo visível é derivado do gênero de cada um. Quando os dois
// têm o mesmo gênero (ou falta o dado), cai pra "Pessoa 1"/"Pessoa 2" — nunca
// dois rótulos iguais.

export type Persona = "p1" | "p2";

function labelFromGender(gender: string): string {
  return gender === "homem" ? "Ele" : "Ela";
}

export function personaLabels(
  gender: string | null | undefined,
  partnerGender: string | null | undefined,
): { p1: string; p2: string } {
  if (gender && partnerGender && gender !== partnerGender) {
    return { p1: labelFromGender(gender), p2: labelFromGender(partnerGender) };
  }
  return { p1: "Pessoa 1", p2: "Pessoa 2" };
}

export function personaLabel(
  gender: string | null | undefined,
  partnerGender: string | null | undefined,
  persona: string | null | undefined,
): string | null {
  if (persona !== "p1" && persona !== "p2") return null;
  return personaLabels(gender, partnerGender)[persona];
}
