import type { Correction } from "@/contracts/correction";

export type DialectSheetDraft = {
  lemma: string;
  example: string;
  pattern: string | null;
  rule: string;
};

export function containingSentence(
  text: string,
  quote: string,
  span: Correction["span"],
): string {
  const start = span?.start ?? text.indexOf(quote);
  if (start < 0) return quote;
  const end = span?.end ?? start + quote.length;
  const prefix = text.slice(0, start);
  const lastStop = Math.max(
    prefix.lastIndexOf("."),
    prefix.lastIndexOf("!"),
    prefix.lastIndexOf("?"),
  );
  const from = lastStop === -1 ? 0 : lastStop + 1;
  const stop = text.slice(end).search(/[.!?]/);
  const to = stop < 0 ? text.length : end + stop + 1;
  return text.slice(from, to).trim();
}

export function dialectSheetDraft(
  correction: Pick<
    Correction,
    | "quote"
    | "span"
    | "ruleIfDialect"
    | "dialectLemma"
    | "dialectExample"
    | "dialectPattern"
  >,
  writingText: string,
): DialectSheetDraft {
  return {
    lemma: correction.dialectLemma ?? correction.quote,
    example:
      correction.dialectExample ??
      containingSentence(writingText, correction.quote, correction.span),
    pattern: correction.dialectPattern,
    rule: correction.ruleIfDialect ?? "",
  };
}
