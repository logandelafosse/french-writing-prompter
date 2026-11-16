export type LocatedQuote =
  | { span: { start: number; end: number }; anchor: "exact" | "normalized" }
  | { span: null; anchor: "none" };

type NormMap = {
  normalized: string;
  ranges: { start: number; end: number }[];
};

function isWs(s: string): boolean {
  return /^\s+$/u.test(s);
}

function transformUnit(raw: string): string {
  return raw
    .normalize("NFC")
    .replace(/\u2019/g, "'")
    .replace(/\u00A0|\u202F/g, " ")
    .toLowerCase();
}

function buildNormalized(text: string): NormMap {
  let normalized = "";
  const ranges: { start: number; end: number }[] = [];
  let i = 0;
  while (i < text.length) {
    const code = text.codePointAt(i);
    if (code === undefined) break;
    const charLen = code > 0xffff ? 2 : 1;
    const transformed = transformUnit(text.slice(i, i + charLen));
    const end = i + charLen;
    if (transformed.length === 0) {
      i = end;
      continue;
    }
    if (isWs(transformed)) {
      const last = ranges[ranges.length - 1];
      if (normalized.endsWith(" ") && last) {
        last.end = end;
      } else {
        normalized += " ";
        ranges.push({ start: i, end });
      }
    } else {
      for (let k = 0; k < transformed.length; k++) {
        normalized += transformed.slice(k, k + 1);
        ranges.push({ start: i, end });
      }
    }
    i = end;
  }
  return { normalized, ranges };
}

function nthIndex(haystack: string, needle: string, n: number, from: number) {
  if (needle.length === 0 || n < 1) return -1;
  let start = from;
  let found = 0;
  while (start <= haystack.length) {
    const idx = haystack.indexOf(needle, start);
    if (idx === -1) return -1;
    found += 1;
    if (found === n) return idx;
    start = idx + needle.length;
  }
  return -1;
}

function spanAt(text: string, start: number, length: number) {
  return { start, end: start + length };
}

function locateExact(
  text: string,
  quote: string,
  occurrence: number,
  cursor: number,
) {
  const nth = nthIndex(text, quote, occurrence, 0);
  if (nth !== -1) return spanAt(text, nth, quote.length);
  const after = text.indexOf(quote, cursor);
  if (after !== -1) return spanAt(text, after, quote.length);
  const first = text.indexOf(quote);
  if (first !== -1) return spanAt(text, first, quote.length);
  return null;
}

function cursorToNorm(
  ranges: { start: number; end: number }[],
  cursor: number,
): number {
  for (let i = 0; i < ranges.length; i++) {
    const range = ranges[i];
    if (range !== undefined && range.start >= cursor) return i;
  }
  return ranges.length;
}

function locateOn(
  haystack: string,
  needle: string,
  occurrence: number,
  from: number,
  toSpan: (idx: number, len: number) => { start: number; end: number } | null,
) {
  const nth = nthIndex(haystack, needle, occurrence, 0);
  if (nth !== -1) return toSpan(nth, needle.length);
  const after = haystack.indexOf(needle, from);
  if (after !== -1) return toSpan(after, needle.length);
  const first = haystack.indexOf(needle);
  if (first !== -1) return toSpan(first, needle.length);
  return null;
}

function locateNormalized(
  text: string,
  quote: string,
  occurrence: number,
  cursor: number,
) {
  const map = buildNormalized(text);
  const needle = buildNormalized(quote).normalized;
  if (needle.length === 0) return null;
  const from = cursorToNorm(map.ranges, cursor);
  return locateOn(map.normalized, needle, occurrence, from, (idx, len) => {
    const startRange = map.ranges[idx];
    const endRange = map.ranges[idx + len - 1];
    if (startRange === undefined || endRange === undefined) return null;
    return { start: startRange.start, end: endRange.end };
  });
}

function stripPunctuation(quote: string): string {
  return quote.replace(/^\p{P}+/u, "").replace(/\p{P}+$/u, "");
}

export function locateQuote(
  text: string,
  quote: string,
  occurrence: number,
  cursor: number,
): LocatedQuote {
  if (quote.length === 0) return { span: null, anchor: "none" };
  const exact = locateExact(text, quote, occurrence, cursor);
  if (exact) return { span: exact, anchor: "exact" };
  const normalized = locateNormalized(text, quote, occurrence, cursor);
  if (normalized) return { span: normalized, anchor: "normalized" };
  const stripped = stripPunctuation(quote);
  if (stripped !== quote && stripped.length > 0) {
    const exactStripped = locateExact(text, stripped, occurrence, cursor);
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
