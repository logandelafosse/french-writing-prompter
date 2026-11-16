import { z } from "zod";
import { CefrLevel, LevelSource } from "./cefr";
import { Evaluation, EvaluationV2 } from "./evaluation";
import { Correction } from "./correction";
import { DialectNote, DialectNoteScope } from "./dialect-note";
import { Weakness } from "./weakness";
import {
  DIALECT_NOTE_EXAMPLE_MAX,
  DIALECT_NOTE_FORM_MAX,
} from "@/config/limits";
import { PromptConstraints } from "./prompt";
import { PromptMeta } from "./prompt-meta";
import { SessionStatus, SessionView } from "./session";

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

export const SessionEvaluatePostBody = z.strictObject({
  text: z.string(),
});

export const EvaluateSessionDto = z.strictObject({
  id: z.number().int(),
  createdAt: z.string(),
  promptText: z.string(),
  writingText: z.string().nullable(),
  promptLevel: CefrLevel.nullable(),
  status: SessionStatus,
  cefrLevel: CefrLevel.nullable(),
});

export const EvaluatePostResponse = z.strictObject({
  session: EvaluateSessionDto,
  evaluation: EvaluationV2,
  corrections: z.array(Correction),
  advancement: LevelChangeDto.nullable(),
});
export type EvaluatePostResponse = z.infer<typeof EvaluatePostResponse>;

export const CorrectionPatchBody = z.strictObject({
  action: z.enum(["acknowledge", "reject_dialect"]),
});

export const CorrectionPatchResponse = z.strictObject({
  correction: Correction,
});
export type CorrectionPatchResponse = z.infer<typeof CorrectionPatchResponse>;

export const DialectNoteCreateBody = z.strictObject({
  rule: z.string(),
  example: z.string().max(DIALECT_NOTE_EXAMPLE_MAX).nullable().optional(),
  scope: DialectNoteScope,
  form: z.string().min(1).max(DIALECT_NOTE_FORM_MAX),
  learnerForm: z.string().nullable().optional(),
  tutorSuggestion: z.string().nullable().optional(),
  fromCorrectionId: z.string().optional(),
});
export type DialectNoteCreateBody = z.infer<typeof DialectNoteCreateBody>;

export const DialectNoteCreateResponse = z.strictObject({
  note: DialectNote,
  correction: Correction.optional(),
});
export type DialectNoteCreateResponse = z.infer<
  typeof DialectNoteCreateResponse
>;

export const DialectNoteListResponse = z.strictObject({
  notes: z.array(DialectNote),
});
export type DialectNoteListResponse = z.infer<typeof DialectNoteListResponse>;

export const DialectNotePatchBody = z.strictObject({
  rule: z.string().optional(),
  example: z.string().max(DIALECT_NOTE_EXAMPLE_MAX).nullable().optional(),
  scope: DialectNoteScope.optional(),
  form: z.string().min(1).max(DIALECT_NOTE_FORM_MAX).optional(),
});
export type DialectNotePatchBody = z.infer<typeof DialectNotePatchBody>;

export const DialectNotePatchResponse = z.strictObject({
  note: DialectNote,
});
export type DialectNotePatchResponse = z.infer<typeof DialectNotePatchResponse>;

export const WeaknessesGetResponse = z.strictObject({
  weaknesses: z.array(Weakness),
});
export type WeaknessesGetResponse = z.infer<typeof WeaknessesGetResponse>;

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
