import { z } from "zod";
import {
  DIALECT_NOTE_EXAMPLE_MAX,
  DIALECT_NOTE_FORM_MAX,
  DIALECT_NOTE_RULE_MAX,
  DIALECT_NOTE_RULE_MIN,
} from "@/config/limits";

export const DialectNoteScope = z.enum(["word", "pattern"]);
export type DialectNoteScope = z.infer<typeof DialectNoteScope>;

export const DialectNote = z.object({
  id: z.number().int(),
  rule: z.string().min(DIALECT_NOTE_RULE_MIN).max(DIALECT_NOTE_RULE_MAX),
  example: z.string().max(DIALECT_NOTE_EXAMPLE_MAX).nullable(),
  scope: DialectNoteScope,
  form: z.string().min(1).max(DIALECT_NOTE_FORM_MAX),
  learnerForm: z.string().nullable(),
  tutorSuggestion: z.string().nullable(),
  sourceSessionId: z.number().int().nullable(),
  sourceCorrectionId: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type DialectNote = z.infer<typeof DialectNote>;

export type LearnerDialectNote = {
  scope: DialectNoteScope;
  form: string;
  learnerForm: string | null;
  rule: string;
  deletedAt: string | null;
};
