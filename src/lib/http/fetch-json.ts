import { z, type ZodType } from "zod";
import { parseJson } from "@/lib/json";

const ErrorBodySchema = z.object({
  error: z.string().optional(),
  message: z.string().optional(),
});

export type FetchError =
  | { kind: "network" }
  | { kind: "http"; status: number; message: string }
  | { kind: "invalid" };

export type FetchJsonResult<T> =
  { ok: true; value: T } | { ok: false; error: FetchError };

function errorMessageFromBody(text: string, fallback: string): string {
  const parsed = parseJson(ErrorBodySchema, text);
  if (!parsed.ok) {
    return fallback;
  }
  return parsed.value.error ?? parsed.value.message ?? fallback;
}

export async function fetchJson<S extends ZodType>(
  url: string,
  schema: S,
  init?: RequestInit,
): Promise<FetchJsonResult<z.infer<S>>> {
  let response: Response;
  try {
    response = await fetch(url, init);
  } catch {
    return { ok: false, error: { kind: "network" } };
  }

  let text: string;
  try {
    text = await response.text();
  } catch {
    return { ok: false, error: { kind: "network" } };
  }

  if (!response.ok) {
    return {
      ok: false,
      error: {
        kind: "http",
        status: response.status,
        message: errorMessageFromBody(text, response.statusText),
      },
    };
  }

  const parsed = parseJson(schema, text);
  if (!parsed.ok) {
    return { ok: false, error: { kind: "invalid" } };
  }

  return { ok: true, value: parsed.value };
}
