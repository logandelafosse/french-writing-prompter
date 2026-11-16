import { z } from "zod";
import {
  EVALUATION_SCORE_MAX,
  EVALUATOR_CORRECTIONS_MAX,
} from "@/config/limits";
import { CefrLevel } from "./cefr";
import { CorrectionKind } from "./correction";
import { MistakeCategory } from "./mistake-category";
import { parseJson } from "@/lib/json";

export const DIMENSION_IDS = [
  "grammatical_accuracy",
  "vocabulary",
  "coherence",
  "register_style",
] as const;
export const Dimension = z.enum(DIMENSION_IDS);
export type Dimension = z.infer<typeof Dimension>;

const LegacyDimensionScore = z.object({
  score: z.number(),
  max: z.number(),
  comment: z.string(),
});

const EvaluationDimensions = z.object({
  grammatical_accuracy: LegacyDimensionScore,
  vocabulary: LegacyDimensionScore,
  coherence: LegacyDimensionScore,
  register_style: LegacyDimensionScore,
});

const EvaluationTips = z.object({
  per_dimension: z.object({
    grammatical_accuracy: z.string(),
    vocabulary: z.string(),
    coherence: z.string(),
    register_style: z.string(),
  }),
  holistic: z.string(),
});

/** Legacy Evaluation (v1) — History placeholder and Placement. */
export const Evaluation = z.object({
  dimensions: EvaluationDimensions,
  overall_cefr: CefrLevel,
  tips: EvaluationTips,
});
export type Evaluation = z.infer<typeof Evaluation>;
export type DimensionScore = z.infer<typeof LegacyDimensionScore>;
export type EvaluationDimensions = z.infer<typeof EvaluationDimensions>;
export type EvaluationTips = z.infer<typeof EvaluationTips>;

const OutputDimensionScore = z.strictObject({
  score: z.number().int().min(1).max(EVALUATION_SCORE_MAX),
  comment: z.string(),
});

const OutputDimensions = z.strictObject({
  grammatical_accuracy: OutputDimensionScore,
  vocabulary: OutputDimensionScore,
  coherence: OutputDimensionScore,
  register_style: OutputDimensionScore,
} satisfies Record<Dimension, typeof OutputDimensionScore>);

export const EvaluatorOutputCorrectionSchema = z.strictObject({
  kind: CorrectionKind,
  quote: z.string(),
  occurrence: z.number().int(),
  suggestion: z.string(),
  explanation: z.string(),
  category: z.string().nullable(),
  question: z.string().nullable(),
  rule_if_dialect: z.string().nullable(),
  dlf_headword: z.string().nullable(),
  resource_ids: z.array(z.string()),
  context_quote: z.string().nullable(),
  dialect_example: z.string().nullable(),
  dialect_lemma: z.string().nullable(),
  dialect_pattern: z.string().nullable(),
});

export const EvaluatorOutputSchema = z.strictObject({
  dimensions: OutputDimensions,
  overall_cefr: CefrLevel,
  summary: z.string(),
  next_level_tip: z.string(),
  corrections: z
    .array(EvaluatorOutputCorrectionSchema)
    .max(EVALUATOR_CORRECTIONS_MAX),
});
export type EvaluatorOutput = z.infer<typeof EvaluatorOutputSchema>;
export type EvaluatorOutputDraft = EvaluatorOutput;

export const EvaluationV2 = z.strictObject({
  version: z.literal(2),
  dimensions: OutputDimensions,
  overallCefr: CefrLevel,
  summary: z.string(),
  nextLevelTip: z.string(),
  model: z.string(),
  promptVersion: z.string(),
  evaluatedAt: z.string(),
});
export type EvaluationV2 = z.infer<typeof EvaluationV2>;

export type StoredEvaluation =
  | { status: "v2"; value: EvaluationV2 }
  | { status: "v1"; value: Evaluation }
  | { status: "malformed" }
  | { status: "none" };

export function parseStoredEvaluation(json: string | null): StoredEvaluation {
  if (json === null) return { status: "none" };
  const v2 = parseJson(EvaluationV2, json);
  if (v2.ok) return { status: "v2", value: v2.value };
  const v1 = parseJson(Evaluation, json);
  if (v1.ok) return { status: "v1", value: v1.value };
  return { status: "malformed" };
}

function placeholderFromDimensions(
  dimensions: EvaluatorOutput["dimensions"],
  overall_cefr: Evaluation["overall_cefr"],
  holistic: string,
): Evaluation {
  const per_dimension = {
    grammatical_accuracy: dimensions.grammatical_accuracy.comment,
    vocabulary: dimensions.vocabulary.comment,
    coherence: dimensions.coherence.comment,
    register_style: dimensions.register_style.comment,
  };
  const scores = {
    grammatical_accuracy: dimensions.grammatical_accuracy,
    vocabulary: dimensions.vocabulary,
    coherence: dimensions.coherence,
    register_style: dimensions.register_style,
  };
  return {
    overall_cefr,
    tips: { per_dimension, holistic },
    dimensions: {
      grammatical_accuracy: {
        ...scores.grammatical_accuracy,
        max: EVALUATION_SCORE_MAX,
      },
      vocabulary: { ...scores.vocabulary, max: EVALUATION_SCORE_MAX },
      coherence: { ...scores.coherence, max: EVALUATION_SCORE_MAX },
      register_style: { ...scores.register_style, max: EVALUATION_SCORE_MAX },
    },
  };
}

export function toPlaceholderEvaluation(
  value: Evaluation | EvaluationV2 | EvaluatorOutput,
): Evaluation {
  if ("tips" in value) return value;
  if ("version" in value) {
    return placeholderFromDimensions(
      value.dimensions,
      value.overallCefr,
      value.nextLevelTip,
    );
  }
  return placeholderFromDimensions(
    value.dimensions,
    value.overall_cefr,
    value.next_level_tip,
  );
}

export function parseCorrectionCategory(
  raw: string | null,
): MistakeCategory | null {
  if (raw === null) return null;
  const parsed = MistakeCategory.safeParse(raw);
  return parsed.success ? parsed.data : null;
}
