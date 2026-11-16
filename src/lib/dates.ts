function resolvedTimeZone(timeZone?: string): string {
  if (timeZone) return timeZone;
  if (typeof Intl !== "undefined") {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  }
  return "UTC";
}

export function appTimeZone(): string {
  return resolvedTimeZone();
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

/** ISO instant of the next local midnight after `from` in `timeZone`. */
export function nextLocalMidnightIso(
  from: Date = new Date(),
  timeZone?: string,
): string {
  const tz = resolvedTimeZone(timeZone);
  const today = localDateKey(from, tz);
  let lo = from.getTime();
  let hi = lo + 36 * 60 * 60 * 1000;
  while (localDateKey(new Date(hi), tz) === today) {
    hi += 60 * 60 * 1000;
  }
  while (hi - lo > 1) {
    const mid = Math.floor((lo + hi) / 2);
    if (localDateKey(new Date(mid), tz) === today) {
      lo = mid;
    } else {
      hi = mid;
    }
  }
  return new Date(hi).toISOString();
}

export function homeDateTitleParts(
  date: Date,
  timeZone?: string,
): { weekday: string; dayMonth: string; desktop: string } {
  const lower = formatFrenchDate(date, timeZone);
  const parts = lower.split(" ");
  const weekdayRaw = parts[0] ?? "";
  const weekday =
    weekdayRaw.length > 0
      ? `${weekdayRaw.charAt(0).toUpperCase()}${weekdayRaw.slice(1)}`
      : "";
  const dayMonth = parts.slice(1).join(" ");
  const desktop =
    lower.length > 0
      ? `${lower.charAt(0).toUpperCase()}${lower.slice(1)}`
      : lower;

  return { weekday, dayMonth, desktop };
}

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
