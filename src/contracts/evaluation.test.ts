import { describe, expect, it } from "vitest";
import { AI_MODEL } from "@/config/ai";
import { EVALUATOR_CORRECTIONS_MAX } from "@/config/limits";
import {
  DIMENSION_IDS,
  Dimension,
  EvaluationV2,
  EvaluatorOutputSchema,
  parseStoredEvaluation,
} from "./evaluation";
import evaluationV1 from "@/test/fixtures/ai/evaluation.valid.json";

const evaluationV2 = {
  version: 2,
  dimensions: {
    grammatical_accuracy: { score: 4, comment: "a" },
    vocabulary: { score: 3, comment: "b" },
    coherence: { score: 4, comment: "c" },
    register_style: { score: 3, comment: "d" },
  },
  overallCefr: "B1" as const,
  summary: "s",
  nextLevelTip: "t",
  model: AI_MODEL,
  promptVersion: "evaluator@2",
  evaluatedAt: "2026-11-16T18:00:00.000Z",
};

describe("parseStoredEvaluation", () => {
  it("classifies v2, v1 and malformed rows and never throws", () => {
    expect(parseStoredEvaluation(null)).toEqual({ status: "none" });
    expect(parseStoredEvaluation('{"score": 5}')).toEqual({
      status: "malformed",
    });
    expect(() => parseStoredEvaluation("{")).not.toThrow();
    expect(parseStoredEvaluation("{")).toEqual({ status: "malformed" });

    const v1 = parseStoredEvaluation(JSON.stringify(evaluationV1));
    expect(v1).toMatchObject({
      status: "v1",
      value: { overall_cefr: "B1" },
    });

    expect(EvaluationV2.parse(evaluationV2).version).toBe(2);
    const v2 = parseStoredEvaluation(JSON.stringify(evaluationV2));
    expect(v2).toMatchObject({
      status: "v2",
      value: { overallCefr: "B1" },
    });
  });
});

describe("EvaluatorOutputSchema", () => {
  const dimensions = {
    grammatical_accuracy: { score: 4, comment: "ok" },
    vocabulary: { score: 3, comment: "ok" },
    coherence: { score: 4, comment: "ok" },
    register_style: { score: 3, comment: "ok" },
  };

  it("uses nullable fields, not optional", () => {
    const withNulls = EvaluatorOutputSchema.safeParse({
      dimensions,
      overall_cefr: "B1",
      summary: "s",
      next_level_tip: "t",
      corrections: [
        {
          kind: "mistake",
          quote: "je suis",
          occurrence: 1,
          suggestion: "je sois",
          explanation: "x",
          category: null,
          question: null,
          rule_if_dialect: null,
          dlf_headword: null,
          resource_ids: [],
          context_quote: null,
          dialect_example: null,
          dialect_lemma: null,
          dialect_pattern: null,
        },
      ],
    });
    expect(withNulls.success).toBe(true);

    const omittedNullable = EvaluatorOutputSchema.safeParse({
      dimensions,
      overall_cefr: "B1",
      summary: "s",
      next_level_tip: "t",
      corrections: [
        {
          kind: "mistake",
          quote: "je suis",
          occurrence: 1,
          suggestion: "je sois",
          explanation: "x",
          resource_ids: [],
        },
      ],
    });
    expect(omittedNullable.success).toBe(false);

    const missingOverall = EvaluatorOutputSchema.safeParse({
      dimensions,
      summary: "s",
      next_level_tip: "t",
      corrections: [],
    });
    expect(missingOverall.success).toBe(false);
  });

  it("rejects extra keys and too many corrections; accepts unknown category strings", () => {
    const base = {
      dimensions,
      overall_cefr: "B1" as const,
      summary: "s",
      next_level_tip: "t",
      corrections: [] as unknown[],
    };
    expect(
      EvaluatorOutputSchema.safeParse({ ...base, extra: true }).success,
    ).toBe(false);

    const invented = EvaluatorOutputSchema.safeParse({
      ...base,
      corrections: [
        {
          kind: "mistake",
          quote: "bayou",
          occurrence: 1,
          suggestion: "bayou",
          explanation: "x",
          category: "not_a_real_category",
          question: null,
          rule_if_dialect: null,
          dlf_headword: null,
          resource_ids: [],
          context_quote: null,
          dialect_example: null,
          dialect_lemma: null,
          dialect_pattern: null,
        },
      ],
    });
    expect(invented.success).toBe(true);

    const tooMany = EvaluatorOutputSchema.safeParse({
      ...base,
      corrections: Array.from(
        { length: EVALUATOR_CORRECTIONS_MAX + 1 },
        () => ({
          kind: "mistake",
          quote: "x",
          occurrence: 1,
          suggestion: "y",
          explanation: "e",
          category: "autre",
          question: null,
          rule_if_dialect: null,
          dlf_headword: null,
          resource_ids: [],
          context_quote: null,
          dialect_example: null,
          dialect_lemma: null,
          dialect_pattern: null,
        }),
      ),
    });
    expect(tooMany.success).toBe(false);
  });
});

describe("Dimension", () => {
  it("is the single source for the four dimension keys", () => {
    expect(Dimension.options).toEqual(DIMENSION_IDS);
    expect([...Dimension.options]).toEqual([
      "grammatical_accuracy",
      "vocabulary",
      "coherence",
      "register_style",
    ]);
  });
});
