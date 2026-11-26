// QUANTO TEMPO A PESSOA TEM DE MEIO.
//
// Quatro degraus, sem buraco entre eles: quem está com 8 meses tem onde se
// encaixar, o que não acontecia quando a escada ia de "menos de 6 meses"
// direto para "mais de 1 ano".
//
// A cor existe para a identificação ser imediata — bate o olho na lista e já
// se sabe quem está chegando agora. Mas ela nunca aparece sozinha: vem
// sempre com o rótulo ao lado, porque cor isolada exclui quem não distingue
// bem tons e obriga todo mundo a decorar um código.
//
// A paleta é a do próprio Secret (areia → dourado → cobre → vinho), escolhida
// pelo dono em 26/11/2026. A progressão se lê sem legenda, e nenhuma delas
// grita "nível superior": no público daqui — casal iniciante, gente tímida —
// parecer ranking é o efeito que a gente NÃO quer.

export const EXPERIENCE_LEVELS = [
  "chegando",
  "ate_6_meses",
  "ate_5_anos",
  "mais_de_5_anos",
] as const;

export type ExperienceLevel = (typeof EXPERIENCE_LEVELS)[number];

export const EXPERIENCE_LEVEL_LABELS: Record<ExperienceLevel, string> = {
  chegando: "Chegando agora",
  ate_6_meses: "Até 6 meses",
  ate_5_anos: "De 6 meses a 5 anos",
  mais_de_5_anos: "Mais de 5 anos",
};

/// Explica o degrau na hora de escolher, no cadastro e no perfil. Some das
/// listas — ali o rótulo basta.
export const EXPERIENCE_LEVEL_HINTS: Record<ExperienceLevel, string> = {
  chegando: "Nunca participei, ou estou nas primeiras semanas",
  ate_6_meses: "Comecei há pouco e já saí de casa algumas vezes",
  ate_5_anos: "Já tenho estrada",
  mais_de_5_anos: "Estou no meio há bastante tempo",
};

export const EXPERIENCE_LEVEL_COLORS: Record<ExperienceLevel, string> = {
  chegando: "#D8C9A8",
  ate_6_meses: "#C9A227",
  ate_5_anos: "#B5733A",
  mais_de_5_anos: "#8E2740",
};

export function ehNivelValido(v: unknown): v is ExperienceLevel {
  return typeof v === "string" && (EXPERIENCE_LEVELS as readonly string[]).includes(v);
}
