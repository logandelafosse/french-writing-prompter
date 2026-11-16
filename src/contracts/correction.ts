import { z } from "zod";
import { MistakeCategory } from "./mistake-category";

export const CorrectionKind = z.enum(["mistake", "standard", "dialect_check"]);
export type CorrectionKind = z.infer<typeof CorrectionKind>;

export const CorrectionStatus = z.enum([
  "open",
  "acknowledged",
  "confirmed_dialect",
  "confirmed_mistake",
  "overturned",
]);
export type CorrectionStatus = z.infer<typeof CorrectionStatus>;

export const CorrectionAnchor = z.enum(["exact", "normalized", "none"]);
export type CorrectionAnchor = z.infer<typeof CorrectionAnchor>;

export const Span = z
  .object({
    start: z.number().int().nonnegative(),
    end: z.number().int().positive(),
  })
  .refine((s) => s.end > s.start);
export type Span = z.infer<typeof Span>;

export const Correction = z.object({
  id: z.string(),
  sessionId: z.number().int(),
  ordinal: z.number().int(),
  kind: CorrectionKind,
  quote: z.string().min(1),
  span: Span.nullable(),
  anchor: CorrectionAnchor,
  suggestion: z.string(),
  explanation: z.string(),
  question: z.string().nullable(),
  ruleIfDialect: z.string().nullable(),
  category: MistakeCategory.nullable(),
  dlf: z.object({ entryId: z.string(), headword: z.string() }).nullable(),
  resourceIds: z.array(z.string()),
  status: CorrectionStatus,
  dialectNoteId: z.number().int().nullable(),
  isFocus: z.boolean(),
  contextQuote: z.string().nullable().default(null),
  dialectExample: z.string().nullable().default(null),
  dialectLemma: z.string().nullable().default(null),
  dialectPattern: z.string().nullable().default(null),
});
export type Correction = z.infer<typeof Correction>;

export function countsAsMistake(
  c: Pick<Correction, "kind" | "status">,
): boolean {
  return (
    (c.kind === "mistake" && c.status !== "overturned") ||
    (c.kind === "dialect_check" && c.status === "confirmed_mistake")
  );
}
