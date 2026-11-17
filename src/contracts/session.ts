import { z } from "zod";
import { CefrLevel } from "./cefr";
import { Evaluation } from "./evaluation";
import { MistakeCategory } from "./mistake-category";

export const SessionStatus = z.enum(["active", "evaluated", "abandoned"]);
export type SessionStatus = z.infer<typeof SessionStatus>;

export const SessionKind = z.enum(["daily", "placement"]);
export type SessionKind = z.infer<typeof SessionKind>;

export const SessionDisplayStatus = z.enum([
  "in_progress",
  "evaluated",
  "draft_abandoned",
  "prompt_unused",
]);
export type SessionDisplayStatus = z.infer<typeof SessionDisplayStatus>;

export const DataIssue = z.enum([
  "evaluation_unreadable",
  "evaluation_legacy",
  "prompt_meta_unreadable",
  "focus_unreadable",
]);
export type DataIssue = z.infer<typeof DataIssue>;

export const CorrectionSummaryItem = z.object({
  kind: z.enum(["mistake", "standard", "dialect_note"]),
  quote: z.string(),
  suggestion: z.string().optional(),
});
export type CorrectionSummaryItem = z.infer<typeof CorrectionSummaryItem>;

export const SessionSummary = z.object({
  id: z.number(),
  createdAt: z.string(),
  kind: SessionKind,
  displayStatus: SessionDisplayStatus,
  title: z.string(),
  focus: z.array(z.object({ id: MistakeCategory, label: z.string() })),
  wordCount: z.number().int(),
  mistakeCount: z.number().int(),
  countsByKind: z.object({
    mistake: z.number().int(),
    standard: z.number().int(),
    dialectNote: z.number().int(),
  }),
  promptLevel: CefrLevel.nullable(),
  evaluatedLevel: CefrLevel.nullable(),
  dataIssues: z.array(DataIssue),
  promptText: z.string(),
  excerpt: z.string().nullable(),
  correctionsSummary: z.array(CorrectionSummaryItem),
});
export type SessionSummary = z.infer<typeof SessionSummary>;

export const SavedDraft = z.object({
  text: z.string(),
  savedAt: z.string(),
});
export type SavedDraft = z.infer<typeof SavedDraft>;

const ParsedEvaluation = z.discriminatedUnion("ok", [
  z.object({ ok: z.literal(true), value: Evaluation }),
  z.object({ ok: z.literal(false), reason: z.literal("unreadable") }),
]);

export const SessionView = z.object({
  id: z.number(),
  createdAt: z.string(),
  promptText: z.string(),
  writingText: z.string().nullable(),
  promptLevel: CefrLevel.nullable(),
  evaluation: ParsedEvaluation.nullable(),
});

export type SessionView = z.infer<typeof SessionView>;
export type ParsedEvaluation = z.infer<typeof ParsedEvaluation>;
