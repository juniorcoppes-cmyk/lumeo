import { EXPERIENCE_LEVEL_LABELS, type ExperienceLevel } from "@/lib/experience-level";

export function ExperienceBadge({
  level,
}: {
  level: string | ExperienceLevel | null | undefined;
}) {
  if (!level || !(level in EXPERIENCE_LEVEL_LABELS)) return null;

  return (
    <span className="tag">
      {EXPERIENCE_LEVEL_LABELS[level as ExperienceLevel]}
    </span>
  );
}
