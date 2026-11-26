import {
  EXPERIENCE_LEVEL_COLORS,
  EXPERIENCE_LEVEL_LABELS,
  ehNivelValido,
} from "@/lib/experience-level";

// A bolinha com a cor do tempo de meio, ao lado do nome.
//
// A cor NUNCA vai sozinha: o rótulo vem junto. Cor isolada deixa de fora quem
// não distingue bem tons e obriga o resto a decorar um código de quatro
// matizes — num app onde a pessoa já está insegura, isso é atrito à toa.
export function ExperienceBadge({ level }: { level: string | null | undefined }) {
  if (!ehNivelValido(level)) return null;

  return (
    <span className="tag inline-flex items-center gap-1.5">
      <span
        aria-hidden
        className="h-2.5 w-2.5 shrink-0 rounded-full"
        style={{ backgroundColor: EXPERIENCE_LEVEL_COLORS[level] }}
      />
      {EXPERIENCE_LEVEL_LABELS[level]}
    </span>
  );
}
