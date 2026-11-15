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

export type LevelChangeDto = z.infer<typeof LevelChangeDto>;

export const LevelPutBody = z.strictObject({
  level: CefrLevel,
});

export type LevelPutBody = z.infer<typeof LevelPutBody>;

export const LevelGetResponse = z.strictObject({
  level: CefrLevel.nullable(),
  history: z.array(LevelChangeDto),
});

export type LevelGetResponse = z.infer<typeof LevelGetResponse>;

export const LevelPutResponse = z.strictObject({
  change: LevelChangeDto,
});

export type LevelPutResponse = z.infer<typeof LevelPutResponse>;

export const EvaluatePostBody = z.strictObject({
  writing: z.string(),
  sessionId: z.number(),
});

export type EvaluatePostBody = z.infer<typeof EvaluatePostBody>;

export const EvaluatePostResponse = z.strictObject({
  evaluation: Evaluation,
  advancement: LevelChangeDto.nullable().optional(),
});

export type EvaluatePostResponse = z.infer<typeof EvaluatePostResponse>;

export const WritingPromptDto = z.object({
  text: z.string(),
  constraints: PromptConstraints,
});

export type WritingPromptDto = z.infer<typeof WritingPromptDto>;

export const PromptPostResponse = z.strictObject({
  prompt: WritingPromptDto,
  sessionId: z.number(),
});

export type PromptPostResponse = z.infer<typeof PromptPostResponse>;

export const QuotaGetResponse = z.strictObject({
  used: z.number(),
  remaining: z.number(),
  max: z.number(),
});

export type QuotaGetResponse = z.infer<typeof QuotaGetResponse>;

export const SessionsGetResponse = z.strictObject({
  sessions: z.array(SessionView),
});

export type SessionsGetResponse = z.infer<typeof SessionsGetResponse>;

export const PlacementTestState = z.enum([
  "idle",
  "waiting_for_writing",
  "complete",
]);

export const PlacementGetResponse = z.strictObject({
  state: PlacementTestState,
  step: z.number(),
});

export type PlacementGetResponse = z.infer<typeof PlacementGetResponse>;

export const PlacementPostBody = z.discriminatedUnion("action", [
  z.strictObject({ action: z.literal("start") }),
  z.strictObject({ action: z.literal("submit"), writing: z.string() }),
]);

export type PlacementPostBody = z.infer<typeof PlacementPostBody>;

export const PlacementStartResponse = z.strictObject({
  type: z.literal("prompt"),
  prompt: WritingPromptDto,
  step: z.number(),
});

export const PlacementNextPromptResponse = z.strictObject({
  type: z.literal("next_prompt"),
  prompt: WritingPromptDto,
  step: z.number(),
});

export const PlacementCompleteResponse = z.strictObject({
  type: z.literal("complete"),
  finalLevel: CefrLevel,
  evaluations: z.array(Evaluation),
});

export const PlacementPostResponse = z.union([
  PlacementStartResponse,
  PlacementNextPromptResponse,
  PlacementCompleteResponse,
]);

export type PlacementPostResponse = z.infer<typeof PlacementPostResponse>;
