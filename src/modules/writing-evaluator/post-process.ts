import { AI_MODEL } from "@/config/ai";
import { Correction, type Span } from "@/contracts/correction";
import type { MistakeCategory } from "@/contracts/mistake-category";
import type { LearnerDialectNote } from "@/contracts/dialect-note";
import {
  parseCorrectionCategory,
  type EvaluationV2,
  type EvaluatorOutputDraft,
} from "@/contracts/evaluation";
import { attributeStandard, type DlfHit } from "@/modules/dlf/lookup";
import { matchesActiveWordScopeNote } from "@/modules/dialect/learner-notes";
import { attachResources, resourceIdsFor } from "@/modules/resources/catalog";
import { locateQuote, spansOverlap } from "./locate-quote";

export const EVALUATOR_PROMPT_VERSION = "evaluator@2";

export function dialectCheckQuestion(quote: string): string {
  return `Ça se dit comme ça chez toi, « ${quote} » ?`;
}

export type PostProcessContext = {
  text: string;
  sessionId: number;
  now: () => Date;
  createId: () => string;
  lookupDlf?: (word: string) => DlfHit | null;
  dialectNotes?: readonly LearnerDialectNote[];
  focusCategories?: readonly MistakeCategory[];
};

function nonEmpty(value: string | null): string | null {
  return value !== null && value.length > 0 ? value : null;
}

function sentenceContaining(
  text: string,
  span: Span | null,
  quote: string,
): string {
  const start = span?.start ?? text.indexOf(quote);
  const end = span?.end ?? (start === -1 ? -1 : start + quote.length);
  if (start < 0 || end < 0) return quote;
  let from = start;
  while (from > 0) {
    const prev = text[from - 1];
    if (prev === "." || prev === "!" || prev === "?" || prev === "\n") break;
    from -= 1;
  }
  while (from < start && /\s/.test(text[from] ?? "")) from += 1;
  let to = end;
  while (to < text.length) {
    const ch = text[to];
    to += 1;
    if (ch === "." || ch === "!" || ch === "?") break;
    if (ch === "\n") {
      to -= 1;
      break;
    }
  }
  const sliced = text.slice(from, to).trim();
  return sliced.length > 0 ? sliced : quote;
}

function dialectFields(
  item: EvaluatorOutputDraft["corrections"][number],
  text: string,
  span: Span | null,
) {
  if (item.kind !== "mistake" && item.kind !== "dialect_check") {
    return {
      contextQuote: null,
      dialectExample: null,
      dialectLemma: null,
      dialectPattern: null,
    };
  }
  return {
    contextQuote: nonEmpty(item.context_quote) ?? item.quote,
    dialectExample:
      nonEmpty(item.dialect_example) ??
      sentenceContaining(text, span, item.quote),
    dialectLemma: nonEmpty(item.dialect_lemma) ?? item.quote,
    dialectPattern: nonEmpty(item.dialect_pattern),
  };
}

export function postProcessEvaluation(
  raw: EvaluatorOutputDraft,
  ctx: PostProcessContext,
): { evaluation: EvaluationV2; corrections: Correction[] } {
  const notes = ctx.dialectNotes ?? [];
  const kept = raw.corrections.filter((item) => {
    if (item.quote.length === 0) return false;
    if (item.kind === "standard" && item.suggestion === item.quote)
      return false;
    if (
      (item.kind === "mistake" || item.kind === "dialect_check") &&
      matchesActiveWordScopeNote(item.quote, item.suggestion, notes)
    ) {
      return false;
    }
    return true;
  });

  let cursor = 0;
  const accepted: Span[] = [];
  const located = kept.map((item, originalIndex) => {
    let found = locateQuote(ctx.text, item.quote, item.occurrence, cursor);
    const span = found.span;
    if (span && accepted.some((other) => spansOverlap(span, other))) {
      found = { span: null, anchor: "none" };
    }
    if (found.span) {
      accepted.push(found.span);
      cursor = found.span.end;
    }
    return { item, found, originalIndex };
  });

  let prevKey = -1;
  const ranked = located.map((row) => {
    const sortKey = row.found.span ? row.found.span.start : prevKey + 0.5;
    prevKey = sortKey;
    return { ...row, sortKey };
  });
  ranked.sort(
    (a, b) => a.sortKey - b.sortKey || a.originalIndex - b.originalIndex,
  );

  const createdAt = ctx.now().toISOString();
  const focusSet = new Set(ctx.focusCategories ?? []);
  const corrections = ranked.map((row, index) => {
    const category =
      row.item.kind === "standard"
        ? null
        : (parseCorrectionCategory(row.item.category) ?? "autre");
    return attachResources(
      Correction.parse({
        id: ctx.createId(),
        sessionId: ctx.sessionId,
        ordinal: index + 1,
        kind: row.item.kind,
        quote: row.item.quote,
        span: row.found.span,
        anchor: row.found.anchor,
        suggestion: row.item.suggestion,
        explanation: row.item.explanation,
        question:
          row.item.kind === "dialect_check" &&
          (row.item.question === null || row.item.question.length === 0)
            ? dialectCheckQuestion(row.item.quote)
            : row.item.question,
        ruleIfDialect: row.item.rule_if_dialect,
        category,
        dlf:
          row.item.kind === "standard"
            ? attributeStandard({
                suggestion: row.item.suggestion,
                lookup: ctx.lookupDlf ?? (() => null),
              })
            : null,
        resourceIds: resourceIdsFor(
          row.item.kind,
          category,
          row.item.resource_ids,
        ),
        status: "open",
        dialectNoteId: null,
        isFocus:
          row.item.kind === "mistake" &&
          category !== null &&
          focusSet.has(category),
        ...dialectFields(row.item, ctx.text, row.found.span),
      }),
    );
  });

  return {
    evaluation: {
      version: 2,
      dimensions: raw.dimensions,
      overallCefr: raw.overall_cefr,
      summary: raw.summary,
      nextLevelTip: raw.next_level_tip,
      model: AI_MODEL,
      promptVersion: EVALUATOR_PROMPT_VERSION,
      evaluatedAt: createdAt,
    },
    corrections,
  };
}
