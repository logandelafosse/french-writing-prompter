import type { WeaknessTrend } from "@/contracts/weakness";

/** `windowHasCategory` is the last evaluated sessions, newest first. */
export function computeTrend(
  windowHasCategory: readonly boolean[],
): WeaknessTrend {
  const s = windowHasCategory.filter(Boolean).length;
  const latest = windowHasCategory[0] === true;
  if (latest || s >= 2) return "actif";
  if (s === 1) return "en_progres";
  return "tranquille";
}
