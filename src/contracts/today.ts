import { z } from "zod";
import { CefrLevel } from "./cefr";
import { LevelChangeDto, QuotaGetResponse } from "./api";
import { Correction } from "./correction";
import { EvaluationV2 } from "./evaluation";
import { PromptMeta } from "./prompt-meta";
import { FocusItem } from "./focus";
import { SavedDraft } from "./session";

export const TodayActiveSession = z.object({
  id: z.number(),
  prompt: z.string(),
  promptMeta: PromptMeta.nullable(),
  draft: SavedDraft.nullable(),
});

export type TodayActiveSession = z.infer<typeof TodayActiveSession>;

export const TodayReviewSession = z.object({
  id: z.number(),
  prompt: z.string(),
  promptMeta: PromptMeta.nullable(),
  writingText: z.string(),
  evaluation: EvaluationV2.nullable(),
  corrections: z.array(Correction),
});

export type TodayReviewSession = z.infer<typeof TodayReviewSession>;

export const TodayGetResponse = z.strictObject({
  level: CefrLevel.nullable(),
  levelName: z.string().nullable(),
  quota: QuotaGetResponse,
  focus: z.array(FocusItem),
  activeSession: TodayActiveSession.nullable(),
  reviewSession: TodayReviewSession.nullable(),
  advancement: LevelChangeDto.nullable(),
});

export type TodayGetDto = z.infer<typeof TodayGetResponse>;

export type ResolvedHomePhase =
  | { kind: "A0-first-run" }
  | { kind: "A-ready" }
  | {
      kind: "B-writing";
      sessionId: number;
      promptText: string;
      promptMeta: z.infer<typeof PromptMeta> | null;
      draft: z.infer<typeof SavedDraft> | null;
    }
  | {
      kind: "C-review";
      sessionId: number;
      promptText: string;
      promptMeta: z.infer<typeof PromptMeta> | null;
      writingText: string;
      evaluation: EvaluationV2 | null;
      corrections: Correction[];
    };

export function resolveHomePhase(bootstrap: TodayGetDto): ResolvedHomePhase {
  if (bootstrap.level === null) {
    return { kind: "A0-first-run" };
  }
  if (bootstrap.activeSession !== null) {
    return {
      kind: "B-writing",
      sessionId: bootstrap.activeSession.id,
      promptText: bootstrap.activeSession.prompt,
      promptMeta: bootstrap.activeSession.promptMeta,
      draft: bootstrap.activeSession.draft,
    };
  }
  if (bootstrap.reviewSession !== null) {
    return {
      kind: "C-review",
      sessionId: bootstrap.reviewSession.id,
      promptText: bootstrap.reviewSession.prompt,
      promptMeta: bootstrap.reviewSession.promptMeta,
      writingText: bootstrap.reviewSession.writingText,
      evaluation: bootstrap.reviewSession.evaluation,
      corrections: bootstrap.reviewSession.corrections,
    };
  }
  return { kind: "A-ready" };
}
