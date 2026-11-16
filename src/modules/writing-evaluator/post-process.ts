import { AI_MODEL } from "@/config/ai";
import { Correction, type Span } from "@/contracts/correction";
import {
  parseCorrectionCategory,
  type EvaluationV2,
  type EvaluatorOutputDraft,
} from "@/contracts/evaluation";
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
};

export function postProcessEvaluation(
  raw: EvaluatorOutputDraft,
  ctx: PostProcessContext,
): { evaluation: EvaluationV2; corrections: Correction[] } {
  const kept = raw.corrections.filter(
    (item) =>
      item.quote.length > 0 &&
      !(item.kind === "standard" && item.suggestion === item.quote),
  );

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
  const corrections = ranked.map((row, index) =>
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
      category:
        row.item.kind === "standard"
          ? null
          : (parseCorrectionCategory(row.item.category) ?? "autre"),
      dlf: null,
      resourceIds: [],
      status: "open",
      dialectNoteId: null,
      isFocus: false,
    }),
  );

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
