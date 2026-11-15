function resolvedTimeZone(timeZone?: string): string {
  if (timeZone) return timeZone;
  if (typeof Intl !== "undefined") {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  }
  return "UTC";
}

/** Local calendar date key (YYYY-MM-DD) for quota and sessions. */
export function localDateKey(date: Date, timeZone?: string): string {
  const tz = resolvedTimeZone(timeZone);
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function todayLocalDateKey(timeZone?: string): string {
  return localDateKey(new Date(), timeZone);
}

/** e.g. « samedi 14 novembre » (lowercase weekday and month). */
export function formatFrenchDate(date: Date, timeZone?: string): string {
  const tz = resolvedTimeZone(timeZone);
  const parts = new Intl.DateTimeFormat("fr-FR", {
    timeZone: tz,
    weekday: "long",
    day: "numeric",
    month: "long",
  }).formatToParts(date);

  const weekday = parts.find((p) => p.type === "weekday")?.value ?? "";
  const day = parts.find((p) => p.type === "day")?.value ?? "";
  const month = parts.find((p) => p.type === "month")?.value ?? "";

  return `${weekday} ${day} ${month}`.toLowerCase();
}

/** e.g. « 21 h 42 ». */
export function formatFrenchTime(date: Date, timeZone?: string): string {
  const tz = resolvedTimeZone(timeZone);
  const parts = new Intl.DateTimeFormat("fr-FR", {
    timeZone: tz,
    hour: "numeric",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);

  const hour = parts.find((p) => p.type === "hour")?.value ?? "0";
  const minute = parts.find((p) => p.type === "minute")?.value ?? "00";

  return `${hour} h ${minute}`;
}

export function formatFrenchDateTime(date: Date, timeZone?: string): string {
  return `${formatFrenchDate(date, timeZone)} ${formatFrenchTime(date, timeZone)}`;
}
