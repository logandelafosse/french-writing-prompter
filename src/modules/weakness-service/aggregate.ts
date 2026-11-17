import { PLACEMENT_FEEDS_WEAKNESS_MEMORY } from "@/config/limits";
import { countsAsMistake, type Correction } from "@/contracts/correction";
import type { MistakeCategory } from "@/contracts/mistake-category";
import type { Weakness, WeaknessTrend } from "@/contracts/weakness";
import { mistakeCategoryLabels } from "@/copy/carnet";
import { resourcesForWeakness } from "@/modules/resources/catalog";
import { computeTrend } from "./compute-trend";

export type WeaknessSession = {
  evaluatedAt: string;
  kind: string;
  corrections: Array<
    Pick<Correction, "kind" | "status"> & { category: MistakeCategory | null }
  >;
};

const TREND_RANK = { actif: 0, en_progres: 1, tranquille: 2 } as const;
const WINDOW_SIZE = 5;

function sessionFeedsWeaknessMemory(kind: string): boolean {
  if (kind === "placement") return PLACEMENT_FEEDS_WEAKNESS_MEMORY;
  return kind === "daily";
}

type Bucket = {
  count: number;
  lastSeenAt: string;
  windowHits: boolean[];
  windowCount: number;
};

export type RankedWeakness = {
  category: MistakeCategory;
  label: string;
  count: number;
  lastSeenAt: string;
  trend: WeaknessTrend;
  s: number;
  windowCount: number;
};

export function toWeaknessDto(
  row: RankedWeakness,
  pin: MistakeCategory | null,
  focusIds: ReadonlySet<MistakeCategory>,
): Weakness {
  return {
    category: row.category,
    label: row.label,
    count: row.count,
    lastSeenAt: row.lastSeenAt,
    trend: row.trend,
    isFocus: focusIds.has(row.category),
    pinned: pin === row.category,
    resources: resourcesForWeakness(row.category, row.trend),
  };
}

export function aggregateWeaknesses(
  sessions: WeaknessSession[],
): RankedWeakness[] {
  const feeding = sessions
    .filter((session) => sessionFeedsWeaknessMemory(session.kind))
    .slice()
    .sort((a, b) => b.evaluatedAt.localeCompare(a.evaluatedAt));
  const windowLength = Math.min(WINDOW_SIZE, feeding.length);
  const buckets = new Map<MistakeCategory, Bucket>();

  for (const [index, session] of feeding.entries()) {
    const inSession = new Set<MistakeCategory>();
    for (const correction of session.corrections) {
      if (!countsAsMistake(correction) || correction.category === null) {
        continue;
      }
      const category = correction.category;
      inSession.add(category);
      const inWindow = index < windowLength;
      const bucket = buckets.get(category);
      if (bucket === undefined) {
        buckets.set(category, {
          count: 1,
          lastSeenAt: session.evaluatedAt,
          windowHits: Array.from({ length: windowLength }, () => false),
          windowCount: inWindow ? 1 : 0,
        });
      } else {
        bucket.count += 1;
        if (inWindow) bucket.windowCount += 1;
        if (session.evaluatedAt > bucket.lastSeenAt) {
          bucket.lastSeenAt = session.evaluatedAt;
        }
      }
    }
    if (index >= windowLength) continue;
    for (const category of inSession) {
      const bucket = buckets.get(category);
      if (bucket) bucket.windowHits[index] = true;
    }
  }

  const rows: RankedWeakness[] = [];
  for (const [category, bucket] of buckets) {
    rows.push({
      category,
      label: mistakeCategoryLabels[category],
      count: bucket.count,
      lastSeenAt: bucket.lastSeenAt,
      trend: computeTrend(bucket.windowHits),
      s: bucket.windowHits.filter(Boolean).length,
      windowCount: bucket.windowCount,
    });
  }
  rows.sort((a, b) => {
    const trend = TREND_RANK[a.trend] - TREND_RANK[b.trend];
    if (trend !== 0) return trend;
    if (b.s !== a.s) return b.s - a.s;
    return b.count - a.count;
  });
  return rows;
}
