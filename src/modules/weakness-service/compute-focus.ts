import type { MistakeCategory } from "@/contracts/mistake-category";
import type { WeaknessTrend } from "@/contracts/weakness";

export type FocusCandidate = {
  category: MistakeCategory;
  trend: WeaknessTrend;
  s: number;
  windowCount: number;
  lastSeenAt: string;
};

const FOCUS_LIMIT = 2;

function rankActif(a: FocusCandidate, b: FocusCandidate): number {
  if (b.s !== a.s) return b.s - a.s;
  if (b.windowCount !== a.windowCount) return b.windowCount - a.windowCount;
  return b.lastSeenAt.localeCompare(a.lastSeenAt);
}

export function computeFocus(
  weaknesses: readonly FocusCandidate[],
  pin: MistakeCategory | null,
): MistakeCategory[] {
  const picked: MistakeCategory[] = [];
  if (pin !== null && pin !== "autre") {
    picked.push(pin);
  }
  const rest = weaknesses
    .filter(
      (row) =>
        row.trend === "actif" &&
        row.category !== "autre" &&
        row.category !== pin,
    )
    .slice()
    .sort(rankActif);
  for (const row of rest) {
    if (picked.length >= FOCUS_LIMIT) break;
    picked.push(row.category);
  }
  return picked;
}
