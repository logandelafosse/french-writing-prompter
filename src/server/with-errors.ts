import { NextResponse } from "next/server";
import { AiOutputError } from "@/modules/openai-client/ai-output-error";

const MESSAGES = {
  AI_INVALID_OUTPUT: "La réponse du tuteur était pas lisible.",
  AI_UNAVAILABLE: "Le tuteur est pas joignable ce coup-ci.",
  AI_TIMEOUT: "Le tuteur a pris trop de temps.",
  INTERNAL: "Une erreur s'est produite.",
} as const;

function mapThrownError(error: unknown): {
  status: number;
  code: keyof typeof MESSAGES;
} {
  if (error instanceof AiOutputError) {
    return { status: 502, code: "AI_INVALID_OUTPUT" };
  }
  const name = error instanceof Error ? error.name : "";
  const message = error instanceof Error ? error.message : "";
  let status: number | null = null;
  if (typeof error === "object" && error !== null && "status" in error) {
    const candidate = error.status;
    if (typeof candidate === "number") status = candidate;
  }
  if (
    name === "TimeoutError" ||
    name === "AbortError" ||
    name.includes("Timeout") ||
    /timeout/i.test(message)
  ) {
    return { status: 504, code: "AI_TIMEOUT" };
  }
  if (
    message === "AI service error" ||
    name === "APIConnectionError" ||
    name.includes("Connection") ||
    status === 429 ||
    (status !== null && status >= 500)
  ) {
    return { status: 502, code: "AI_UNAVAILABLE" };
  }
  return { status: 500, code: "INTERNAL" };
}

export function withErrors<Args extends unknown[]>(
  handler: (...args: Args) => Response | Promise<Response>,
): (...args: Args) => Promise<Response> {
  return async (...args: Args) => {
    try {
      return await handler(...args);
    } catch (error) {
      const mapped = mapThrownError(error);
      console.error("withErrors", mapped.code, error);
      return NextResponse.json(
        { error: { code: mapped.code, message: MESSAGES[mapped.code] } },
        { status: mapped.status },
      );
    }
  };
}
