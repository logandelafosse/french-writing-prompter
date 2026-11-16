import { z } from "zod";
import type { ClassifiedFetchFailure } from "@/contracts/errors";
import { parseJson } from "@/lib/json";
import type { FetchError } from "./fetch-json";

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
