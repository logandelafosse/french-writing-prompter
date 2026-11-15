import type { z } from "zod";
import { parseJson } from "@/lib/json";

export type FetchError =
  | { kind: "network" }
  | { kind: "http"; status: number; message: string }
  | { kind: "invalid" };

export type FetchJsonResult<T> =
  { ok: true; value: T } | { ok: false; error: FetchError };

function errorMessageFromBody(text: string, fallback: string): string {
  try {
    const body = JSON.parse(text) as { error?: string; message?: string };
    return body.error ?? body.message ?? fallback;
  } catch {
    return fallback;
  }
}

export async function fetchJson<S extends z.ZodType>(
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
