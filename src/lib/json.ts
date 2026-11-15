import type { z } from "zod";

export type ParseJsonFailureReason = "invalid_json" | "schema_mismatch";

export type ParseJsonResult<T> =
  | { ok: true; value: T }
  | { ok: false; reason: ParseJsonFailureReason; cause: unknown };

export function parseJson<S extends z.ZodType>(
  schema: S,
  text: string,
): ParseJsonResult<z.infer<S>> {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch (cause) {
    return { ok: false, reason: "invalid_json", cause };
  }

  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, reason: "schema_mismatch", cause: parsed.error };
  }

  return { ok: true, value: parsed.data };
}
