import { z } from "zod";

export const ApiErrorBody = z.object({
  error: z.string(),
});

export const EvaluateFailureBody = z.object({
  code: z.string(),
  error: z.string().optional(),
});
