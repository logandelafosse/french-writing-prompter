import { z, type ZodType } from "zod";
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

function withoutLoadingTimeout(init: FetchJsonInit): RequestInit {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- strip before fetch()
  const { loadingTimeout, ...requestInit } = init;
  return requestInit;
}

function requestSignal(
  init: FetchJsonInit | undefined,
): AbortSignal | undefined {
  const userSignal = init?.signal ?? undefined;
  if (!init?.loadingTimeout) return userSignal;
  const timeout = AbortSignal.timeout(FETCH_TIMEOUT_MS);
  if (userSignal === undefined) return timeout;
  return AbortSignal.any([userSignal, timeout]);
}

export async function fetchJson<S extends ZodType>(
  url: string,
  schema: S,
  init?: FetchJsonInit,
): Promise<FetchJsonResult<z.infer<S>>> {
  const requestInit: RequestInit = init ? withoutLoadingTimeout(init) : {};
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
