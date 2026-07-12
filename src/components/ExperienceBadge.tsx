import { EXPERIENCE_LEVEL_LABELS, type ExperienceLevel } from "@/lib/experience-level";

export function ExperienceBadge({
  level,
}: {
  level: string | ExperienceLevel | null | undefined;
}) {
  if (!level || !(level in EXPERIENCE_LEVEL_LABELS)) return null;

  return (
    <span className="rounded-full border px-2 py-0.5 text-xs text-neutral-600">
      {EXPERIENCE_LEVEL_LABELS[level as ExperienceLevel]}
    </span>
  );
}
