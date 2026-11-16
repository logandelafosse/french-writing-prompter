export type LocatedQuote =
  | { span: { start: number; end: number }; anchor: "exact" | "normalized" }
  | { span: null; anchor: "none" };

function transformUnit(raw: string): string {
  return raw
    .normalize("NFC")
    .replace(/\u2019/g, "'")
    .replace(/\u00A0|\u202F/g, " ")
    .toLowerCase();
}

function buildNormalized(text: string) {
  let normalized = "";
  const ranges: { start: number; end: number }[] = [];
  for (let i = 0; i < text.length;) {
    const code = text.codePointAt(i);
    if (code === undefined) break;
    const charLen = code > 0xffff ? 2 : 1;
    const transformed = transformUnit(text.slice(i, i + charLen));
    const start = i;
    i += charLen;
    if (transformed.length === 0) continue;
    if (/^\s+$/u.test(transformed)) {
      const last = ranges[ranges.length - 1];
      if (normalized.endsWith(" ") && last) last.end = i;
      else {
        normalized += " ";
        ranges.push({ start, end: i });
      }
    } else {
      for (let k = 0; k < transformed.length; k++) {
        normalized += transformed.slice(k, k + 1);
        ranges.push({ start, end: i });
      }
    }
  }
  return { normalized, ranges };
}

function findNeedle(
  haystack: string,
  needle: string,
  occurrence: number,
  from: number,
): number {
  if (!needle || occurrence < 1) return -1;
  let start = 0;
  for (let found = 0; start <= haystack.length;) {
    const idx = haystack.indexOf(needle, start);
    if (idx === -1) break;
    if (++found === occurrence) return idx;
    start = idx + needle.length;
  }
  const after = haystack.indexOf(needle, from);
  return after !== -1 ? after : haystack.indexOf(needle);
}

function locateNormalized(
  text: string,
  quote: string,
  occurrence: number,
  cursor: number,
) {
  const map = buildNormalized(text);
  const needle = buildNormalized(quote).normalized;
  if (!needle) return null;
  const found = map.ranges.findIndex((range) => range.start >= cursor);
  const from = found === -1 ? map.ranges.length : found;
  const idx = findNeedle(map.normalized, needle, occurrence, from);
  if (idx === -1) return null;
  const startRange = map.ranges[idx];
  const endRange = map.ranges[idx + needle.length - 1];
  if (startRange === undefined || endRange === undefined) return null;
  return { start: startRange.start, end: endRange.end };
}

function exactSpan(
  text: string,
  quote: string,
  occurrence: number,
  cursor: number,
) {
  const idx = findNeedle(text, quote, occurrence, cursor);
  return idx === -1 ? null : { start: idx, end: idx + quote.length };
}

export function locateQuote(
  text: string,
  quote: string,
  occurrence: number,
  cursor: number,
): LocatedQuote {
  if (!quote) return { span: null, anchor: "none" };
  const exact = exactSpan(text, quote, occurrence, cursor);
  if (exact) return { span: exact, anchor: "exact" };
  const normalized = locateNormalized(text, quote, occurrence, cursor);
  if (normalized) return { span: normalized, anchor: "normalized" };
  const stripped = quote.replace(/^\p{P}+/u, "").replace(/\p{P}+$/u, "");
  if (stripped && stripped !== quote) {
    const exactStripped = exactSpan(text, stripped, occurrence, cursor);
    if (exactStripped) return { span: exactStripped, anchor: "normalized" };
    const normStripped = locateNormalized(text, stripped, occurrence, cursor);
    if (normStripped) return { span: normStripped, anchor: "normalized" };
  }
  return { span: null, anchor: "none" };
}

export function spansOverlap(
  a: { start: number; end: number },
  b: { start: number; end: number },
): boolean {
  return a.start < b.end && b.start < a.end;
}
