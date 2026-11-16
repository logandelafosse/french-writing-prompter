import { z, type ZodType } from "zod";
import type { ClassifiedFetchFailure } from "@/contracts/errors";
import { FETCH_TIMEOUT_MS } from "@/config/limits";
import { parseJson } from "@/lib/json";

const NestedErrorBody = z.object({
  error: z.object({ code: z.string(), message: z.string() }),
});

const FlatErrorBody = z.object({
  error: z.string().optional(),
  message: z.string().optional(),
  code: z.string().optional(),
  wordCount: z.number().int().nonnegative().optional(),
});

export type FetchError =
  | { kind: "network" }
  | {
      kind: "http";
      status: number;
      message: string;
      code?: string;
      wordCount?: number;
    }
  | { kind: "invalid" };

export type FetchJsonResult<T> =
  { ok: true; value: T } | { ok: false; error: FetchError };

export type FetchJsonInit = RequestInit & {
  /** Bounded wait for loading/bootstrap fetches only (today, sessions, level GET). */
  loadingTimeout?: boolean;
};

const LooseErrorEnvelope = z.strictObject({
  error: z.strictObject({ code: z.string(), message: z.string() }),
});

export function classifyFetchFailure(
  thrown?: unknown,
  bodyText?: string,
): ClassifiedFetchFailure {
  if (thrown instanceof TypeError) return "offline";
  if (
    thrown instanceof Error &&
    (thrown.name === "AbortError" || thrown.name === "TimeoutError")
  ) {
    return "offline";
  }
  if (bodyText === undefined) return "generic";
  const parsed = parseJson(LooseErrorEnvelope, bodyText);
  if (!parsed.ok) return "generic";
  return parsed.value.error.code.startsWith("AI_") ? "ai" : "generic";
}

export function classifyFetchError(error: FetchError): ClassifiedFetchFailure {
  if (error.kind === "network") return "offline";
  if (error.kind === "http" && error.code?.startsWith("AI_")) return "ai";
  return "generic";
}

export type { ParseRequestBodyResult } from "./parse-request-body";
export { parseRequestBody } from "./parse-request-body";

function errorFieldsFromBody(
  text: string,
  fallback: string,
): { message: string; code?: string; wordCount?: number } {
  const nested = parseJson(NestedErrorBody, text);
  if (nested.ok) {
    return {
      message: nested.value.error.message,
      code: nested.value.error.code,
    };
  }
  const flat = parseJson(FlatErrorBody, text);
  if (!flat.ok) return { message: fallback };
  return {
    message: flat.value.error ?? flat.value.message ?? fallback,
    ...(flat.value.code === undefined ? {} : { code: flat.value.code }),
    ...(flat.value.wordCount === undefined
      ? {}
      : { wordCount: flat.value.wordCount }),
  };
}

function requestSignal(
  init: FetchJsonInit | undefined,
): AbortSignal | undefined {
  const user = init?.signal ?? undefined;
  if (!init?.loadingTimeout) return user;
  const timeout = AbortSignal.timeout(FETCH_TIMEOUT_MS);
  return user === undefined ? timeout : AbortSignal.any([user, timeout]);
}

export async function fetchJson<S extends ZodType>(
  url: string,
  schema: S,
  init?: FetchJsonInit,
): Promise<FetchJsonResult<z.infer<S>>> {
  const requestInit: RequestInit = init
    ? // eslint-disable-next-line @typescript-eslint/no-unused-vars -- strip client option
      (({ loadingTimeout, ...rest }) => rest)(init)
    : {};
  const signal = requestSignal(init);
  let response: Response;
  try {
    response = await fetch(
      url,
      signal === undefined ? requestInit : { ...requestInit, signal },
    );
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
    const fields = errorFieldsFromBody(text, response.statusText);
    return {
      ok: false,
      error: {
        kind: "http",
        status: response.status,
        message: fields.message,
        ...(fields.code === undefined ? {} : { code: fields.code }),
        ...(fields.wordCount === undefined
          ? {}
          : { wordCount: fields.wordCount }),
      },
    };
  }

  const parsed = parseJson(schema, text);
  if (!parsed.ok) {
    return { ok: false, error: { kind: "invalid" } };
  }

  return { ok: true, value: parsed.value };
}

export function messageFromFetchError(
  error: FetchError,
  fallback: string,
): string {
  if (error.kind === "http") {
    return error.message || fallback;
  }
  return fallback;
}
