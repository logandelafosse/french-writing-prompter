import { z } from "zod";
import { CefrLevel } from "./cefr";
import { SessionDetail } from "./session";

export const PlacementRunStatus = z.enum([
  "in_progress",
  "complete",
  "abandoned",
]);

export const PlacementResultView = z.strictObject({
  finalLevel: CefrLevel,
  levelName: z.string(),
  summary: z.string(),
  steps: z.array(
    z.strictObject({
      step: z.number().int().min(1).max(3),
      promptLevel: CefrLevel,
      evaluatedLevel: CefrLevel,
      summary: z.string(),
      mistakeCount: z.number().int().nonnegative(),
    }),
  ),
});
export type PlacementResultView = z.infer<typeof PlacementResultView>;

export const PlacementRunView = z.strictObject({
  id: z.number().int().positive(),
  status: z.enum(["in_progress", "complete"]),
  step: z.number().int().min(1).max(3),
  session: SessionDetail,
  results: PlacementResultView.optional(),
});
export type PlacementRunView = z.infer<typeof PlacementRunView>;

export const PlacementGetResponse = z.strictObject({
  run: PlacementRunView.nullable(),
});

export const PlacementStartResponse = z.strictObject({
  run: PlacementRunView,
});

export const PlacementSubmitBody = z.strictObject({
  sessionId: z.number().int().positive(),
  text: z.string(),
});

export const PlacementSubmitResponse = PlacementStartResponse.extend({
  results: PlacementResultView.optional(),
});
