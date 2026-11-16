import { z } from "zod";

export const ErrorCode = z.enum([
  "INVALID_JSON",
  "NO_LEVEL",
  "NOT_FOUND",
  "ALREADY_EVALUATED",
  "NOT_ACTIVE",
  "CONFLICT",
  "DRAFT_WOULD_BE_ABANDONED",
  "VALIDATION",
  "QUOTA_EXHAUSTED",
  "AI_UNAVAILABLE",
  "AI_INVALID_OUTPUT",
  "AI_TIMEOUT",
  "INTERNAL",
]);
export type ErrorCode = z.infer<typeof ErrorCode>;

export const ErrorEnvelope = z.strictObject({
  error: z.strictObject({ code: ErrorCode, message: z.string() }),
});
export type ErrorEnvelope = z.infer<typeof ErrorEnvelope>;

export const ClassifiedFetchFailure = z.enum(["offline", "ai", "generic"]);
export type ClassifiedFetchFailure = z.infer<typeof ClassifiedFetchFailure>;
