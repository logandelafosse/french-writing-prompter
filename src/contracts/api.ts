import { z } from "zod";
import { CefrLevel, LevelSource } from "./cefr";
import { Evaluation } from "./evaluation";
import { PromptConstraints } from "./prompt";
import { SessionView } from "./session";

export const LevelChangeDto = z.object({
  fromLevel: CefrLevel.nullable(),
  toLevel: CefrLevel,
  source: LevelSource,
  createdAt: z.string(),
});

export const LevelPutBody = z.strictObject({
  level: CefrLevel,
});

export const LevelGetResponse = z.strictObject({
  level: CefrLevel.nullable(),
  history: z.array(LevelChangeDto),
});

export const LevelPutResponse = z.strictObject({
  change: LevelChangeDto,
});

export const EvaluatePostBody = z.strictObject({
  writing: z.string(),
  sessionId: z.number(),
});

export const EvaluatePostResponse = z.strictObject({
  evaluation: Evaluation,
  advancement: LevelChangeDto.nullable().optional(),
});

export const WritingPromptDto = z.object({
  text: z.string(),
  constraints: PromptConstraints,
});

export const PromptPostResponse = z.strictObject({
  prompt: WritingPromptDto,
  sessionId: z.number(),
});

export const QuotaGetResponse = z.strictObject({
  used: z.number(),
  remaining: z.number(),
  max: z.number(),
  resetsAt: z.string(),
});

export type QuotaGetDto = z.infer<typeof QuotaGetResponse>;

export const SessionsGetResponse = z.strictObject({
  sessions: z.array(SessionView),
});

export const PlacementPostBody = z.discriminatedUnion("action", [
  z.strictObject({ action: z.literal("start") }),
  z.strictObject({ action: z.literal("submit"), writing: z.string() }),
]);

export const PlacementPostResponse = z.union([
  z.strictObject({
    type: z.literal("prompt"),
    prompt: WritingPromptDto,
    step: z.number(),
  }),
  z.strictObject({
    type: z.literal("next_prompt"),
    prompt: WritingPromptDto,
    step: z.number(),
  }),
  z.strictObject({
    type: z.literal("complete"),
    finalLevel: CefrLevel,
    evaluations: z.array(Evaluation),
  }),
]);
