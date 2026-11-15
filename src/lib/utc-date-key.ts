/** Calendar date (UTC) from an ISO-8601 timestamp, e.g. `2026-11-15`. */
export function utcDateKeyFromIso(iso: string): string {
  const separator = iso.indexOf("T");
  if (separator === -1) {
    throw new Error(`Expected ISO timestamp with date and time, got: ${iso}`);
  }
  return iso.slice(0, separator);
}

export function todayUtcDateKey(): string {
  return utcDateKeyFromIso(new Date().toISOString());
}