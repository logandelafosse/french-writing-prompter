export function wordMeterFillRatio(count: number, max: number): number {
  if (max <= 0) return 0;
  return Math.min(count / max, 1);
}
export function wordMeterZoneStartRatio(min: number, max: number): number {
  if (max <= 0) return 0;
  return min / max;
}
export function shouldShowWordNudge(
  count: number,
  target: { min: number; max: number } | null,
): boolean {
  if (target === null || target.min <= 20) return false;
  if (count >= target.min) return false;
  const gap = target.min - count;
  return gap >= 30 && gap <= 80;
}
