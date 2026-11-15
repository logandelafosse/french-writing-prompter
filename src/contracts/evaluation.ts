import { z } from "zod";
import { CefrLevel } from "./cefr";

const DimensionScore = z.object({
  score: z.number(),
  max: z.number(),
  comment: z.string(),
});

const EvaluationDimensions = z.object({
  grammatical_accuracy: DimensionScore,
  vocabulary: DimensionScore,
  coherence: DimensionScore,
  register_style: DimensionScore,
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

export const Evaluation = z.object({
  dimensions: EvaluationDimensions,
  overall_cefr: CefrLevel,
  tips: EvaluationTips,
});

export type Evaluation = z.infer<typeof Evaluation>;
export type DimensionScore = z.infer<typeof DimensionScore>;
export type EvaluationDimensions = z.infer<typeof EvaluationDimensions>;
export type EvaluationTips = z.infer<typeof EvaluationTips>;
