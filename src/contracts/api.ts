import { z } from "zod";
import { CefrLevel, LevelSource } from "./cefr";
import { Evaluation } from "./evaluation";
import { PromptConstraints } from "./prompt";
import { PromptMeta } from "./prompt-meta";
import { SessionView } from "./session";

export const LevelChangeDto = z.object({
  id: z.number().int().positive(),
  fromLevel: CefrLevel.nullable(),
  toLevel: CefrLevel,
  source: LevelSource,
  createdAt: z.string(),
  revertsChangeId: z.number().int().positive().optional(),
});
export type LevelChangeDto = z.infer<typeof LevelChangeDto>;

export const LevelPutBody = z.strictObject({
  level: CefrLevel,
});

export const LevelGetResponse = z.strictObject({
  level: CefrLevel.nullable(),
  history: z.array(LevelChangeDto),
  streak: z.number().int().nonnegative(),
});

export const LevelUndoBody = z.strictObject({
  changeId: z.number().int().positive(),
});

export const LevelUndoResponse = z.strictObject({
  change: LevelChangeDto,
});
export type LevelUndoResponse = z.infer<typeof LevelUndoResponse>;

export type LevelGetDto = z.infer<typeof LevelGetResponse>;

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

export const QuotaGetResponse = z.strictObject({
  used: z.number(),
  remaining: z.number(),
  max: z.number(),
  resetsAt: z.string(),
});

export const WritingPromptDto = z.object({
  text: z.string(),
  meta: PromptMeta,
  constraints: PromptConstraints,
});

export const PromptSessionDto = z.strictObject({
  id: z.number(),
  promptText: z.string(),
  promptMeta: PromptMeta,
});

export const PromptPostBody = z.strictObject({
  replaceSessionId: z.number().int().positive().optional(),
  confirmAbandon: z.boolean().optional(),
});
export type PromptPostBodyValue = z.infer<typeof PromptPostBody>;

export const DraftWouldBeAbandonedResponse = z.strictObject({
  error: z.literal("DRAFT_WOULD_BE_ABANDONED"),
  wordCount: z.number().int().nonnegative(),
});

export const PromptPostResponse = z.strictObject({
  session: PromptSessionDto,
  quota: QuotaGetResponse,
});

export const DraftPutResponse = z.strictObject({
  savedAt: z.string(),
  wordCount: z.number().int(),
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
