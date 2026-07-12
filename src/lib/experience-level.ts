export const EXPERIENCE_LEVELS = ["iniciante", "iniciado", "experiente"] as const;

export type ExperienceLevel = (typeof EXPERIENCE_LEVELS)[number];

export const EXPERIENCE_LEVEL_LABELS: Record<ExperienceLevel, string> = {
  iniciante: "Iniciante (até 3 meses)",
  iniciado: "Iniciado (até 1 ano)",
  experiente: "Experiente (mais de 1 ano)",
};
