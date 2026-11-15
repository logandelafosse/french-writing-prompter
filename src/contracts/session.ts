import { z } from "zod";
import { CefrLevel } from "./cefr";
import { Evaluation } from "./evaluation";

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
