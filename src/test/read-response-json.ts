import type { z, ZodType } from "zod";
import { expect } from "vitest";
import { parseJson } from "@/lib/json";

export async function readResponseJson<S extends ZodType>(
  response: Response,
  schema: S,
): Promise<z.infer<S>> {
  const text = await response.text();
  const parsed = parseJson(schema, text);
  expect(parsed.ok, parsed.ok ? "" : String(parsed.cause)).toBe(true);
  if (!parsed.ok) {
    throw new Error("readResponseJson: parse failed");
  }
  return parsed.value;
}
